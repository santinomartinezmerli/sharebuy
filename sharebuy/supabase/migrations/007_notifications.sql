-- Migration 007: notifications table, triggers and review reminders.
--
-- Until now the Notifications screen rebuilt everything in the browser with
-- about seven queries. This creates a real notifications table (the README
-- described one, but it never existed in the database) that triggers fill when
-- someone likes your post, comments on it or follows you:
--   - notifications: one row per event, for the person who receives it.
--   - Triggers on likes, comments and follows. They never notify you about
--     your own actions, and they never block the action if something fails
--     (EXCEPTION WHEN OTHERS -> WARNING in the log).
--   - Undoing the action removes the notification: unlike and unfollow delete
--     it by trigger, deleting a comment, a post or a profile removes it through
--     the foreign keys.
--   - Backfill of the last 30 days of existing likes, comments and follows,
--     already marked as read.
--   - get_review_reminders(p_days): your posts older than p_days without a
--     review of yours. The number of days is passed by the client (one place).
--
-- Whole migration runs in ONE transaction: it applies fully or not at all.
--
-- Security: users can read and update (only read_at) their OWN notifications.
-- There is no INSERT policy and no INSERT / DELETE grant: only the triggers
-- (SECURITY DEFINER) create and delete rows. Supabase gives anon and
-- authenticated ALL privileges on new tables by default; those are revoked.
--
-- ROLLBACK (run manually, in this order):
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
--     -- (ignore the error if the table was never in the publication)
--   DROP FUNCTION IF EXISTS public.get_review_reminders(int);
--   DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;
--   DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
--   DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
--   DROP FUNCTION IF EXISTS public.notify_on_like();
--   DROP FUNCTION IF EXISTS public.notify_on_comment();
--   DROP FUNCTION IF EXISTS public.notify_on_follow();
--   DROP TABLE IF EXISTS public.notifications;
--   DROP INDEX IF EXISTS public.idx_reviews_post_user;

BEGIN;


-- 1. The table. user_id receives the notification, actor_id caused it.
--    preview is the start of a comment (at most 140 characters).
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL
                REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id    uuid        NOT NULL
                REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL,
  post_id     uuid        REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id  uuid        REFERENCES public.comments(id) ON DELETE CASCADE,
  preview     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz,
  CONSTRAINT notifications_type_check
    CHECK (type IN ('follow', 'like', 'comment')),
  CONSTRAINT notifications_actor_not_self
    CHECK (actor_id <> user_id),
  CONSTRAINT notifications_shape_check CHECK (
       (type = 'follow'  AND post_id IS NULL     AND comment_id IS NULL)
    OR (type = 'like'    AND post_id IS NOT NULL AND comment_id IS NULL)
    OR (type = 'comment' AND post_id IS NOT NULL AND comment_id IS NOT NULL)),
  CONSTRAINT notifications_preview_length
    CHECK (preview IS NULL OR char_length(preview) <= 140)
);


-- 2. Indexes.
--    The list of a user, newest first (also what the screen paginates on).
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC, id DESC);

--    Unread notifications of a user (counting them, marking them as read).
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (user_id) WHERE read_at IS NULL;

--    No duplicates: one follow notification per pair, one like notification
--    per person and post.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_follow
  ON public.notifications (user_id, actor_id) WHERE type = 'follow';
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_like
  ON public.notifications (user_id, actor_id, post_id) WHERE type = 'like';

--    Not in your list: one notification per comment. It is NOT partial on
--    purpose: that makes the backfill safe to re-run and, being a plain index
--    on comment_id, it also serves the ON DELETE CASCADE of the foreign key.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_comment
  ON public.notifications (comment_id);

--    Not in your list: indexes for the other two foreign keys. Deleting a post
--    or a profile cascades into this table, and unliking looks a notification
--    up by post, so without them those would scan the whole table.
CREATE INDEX IF NOT EXISTS idx_notifications_post_id
  ON public.notifications (post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id
  ON public.notifications (actor_id);


-- 3. Row level security and privileges.
--    SELECT and UPDATE only on your own rows; UPDATE only on read_at (column
--    privilege). No INSERT / DELETE policy or grant: only the triggers write.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 4. Triggers. SECURITY DEFINER (they write rows the user may not insert) with
--    a fixed search_path. They only use the values of the row that fired them.
--    A person is never notified about their own action. ON CONFLICT DO NOTHING
--    keeps the unique indexes from raising. EXCEPTION WHEN OTHERS turns any
--    failure into a WARNING in the log: a notification problem must never stop
--    someone from liking, commenting or following. (The counter triggers of
--    006 do the opposite on purpose.)
--
--    Like: INSERT notifies the owner of the post; DELETE (unlike) removes it.
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT p.user_id INTO recipient
    FROM public.posts p
    WHERE p.id = NEW.post_id;

    IF recipient IS NOT NULL
       AND NEW.user_id IS NOT NULL
       AND recipient <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, post_id)
      VALUES (recipient, NEW.user_id, 'like', NEW.post_id)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.notifications
    WHERE type = 'like'
      AND actor_id = OLD.user_id
      AND post_id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_like failed: % (%)', SQLERRM, SQLSTATE;
  RETURN NULL;
END
$$;

--    Comment: INSERT notifies the owner of the post, with the first 140
--    characters of the comment. There is no DELETE branch: deleting the
--    comment removes the notification through the comment_id foreign key.
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient uuid;
BEGIN
  SELECT p.user_id INTO recipient
  FROM public.posts p
  WHERE p.id = NEW.post_id;

  IF recipient IS NOT NULL
     AND NEW.user_id IS NOT NULL
     AND recipient <> NEW.user_id THEN
    INSERT INTO public.notifications
      (user_id, actor_id, type, post_id, comment_id, preview)
    VALUES
      (recipient, NEW.user_id, 'comment', NEW.post_id, NEW.id,
       left(NEW.content, 140))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_comment failed: % (%)', SQLERRM, SQLSTATE;
  RETURN NULL;
END
$$;

--    Follow: INSERT notifies the person who is followed; DELETE (unfollow)
--    removes it.
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.following_id IS NOT NULL
       AND NEW.follower_id IS NOT NULL
       AND NEW.following_id <> NEW.follower_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type)
      VALUES (NEW.following_id, NEW.follower_id, 'follow')
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.notifications
    WHERE type = 'follow'
      AND actor_id = OLD.follower_id
      AND user_id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_follow failed: % (%)', SQLERRM, SQLSTATE;
  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_notify_like ON public.likes;
CREATE TRIGGER trg_notify_like
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

DROP TRIGGER IF EXISTS trg_notify_follow ON public.follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();


-- 5. Backfill: the last 30 days of existing likes, comments and follows, so
--    the screen does not start empty. They keep the date of the event and are
--    marked as read (now), so nobody gets a wall of unread notifications. Your
--    own actions are skipped. ON CONFLICT DO NOTHING makes it safe to re-run
--    (it never touches a notification that already exists). It runs after the
--    triggers exist, so an event that happens meanwhile is covered either way.
INSERT INTO public.notifications
  (user_id, actor_id, type, post_id, created_at, read_at)
SELECT p.user_id, l.user_id, 'like', l.post_id, l.created_at, now()
FROM public.likes l
JOIN public.posts p ON p.id = l.post_id
WHERE l.created_at >= now() - interval '30 days'
  AND l.user_id IS NOT NULL
  AND p.user_id IS NOT NULL
  AND l.user_id <> p.user_id
ON CONFLICT DO NOTHING;

INSERT INTO public.notifications
  (user_id, actor_id, type, post_id, comment_id, preview, created_at, read_at)
SELECT p.user_id, c.user_id, 'comment', c.post_id, c.id,
       left(c.content, 140), c.created_at, now()
FROM public.comments c
JOIN public.posts p ON p.id = c.post_id
WHERE c.created_at >= now() - interval '30 days'
  AND c.user_id IS NOT NULL
  AND p.user_id IS NOT NULL
  AND c.user_id <> p.user_id
ON CONFLICT DO NOTHING;

INSERT INTO public.notifications
  (user_id, actor_id, type, created_at, read_at)
SELECT f.following_id, f.follower_id, 'follow', f.created_at, now()
FROM public.follows f
WHERE f.created_at >= now() - interval '30 days'
  AND f.follower_id IS NOT NULL
  AND f.following_id IS NOT NULL
  AND f.follower_id <> f.following_id
ON CONFLICT DO NOTHING;


-- 6. Realtime. The screen listens for new rows of this table, which only works
--    if it is in the supabase_realtime publication. It is added AFTER the
--    backfill so the bulk insert above does not send thousands of events to
--    connected clients. Guarded: skipped if the publication does not exist, is
--    FOR ALL TABLES, or already has the table. Realtime applies the RLS above,
--    so each person only receives their own notifications.
DO $$
BEGIN
  IF EXISTS (
       SELECT 1 FROM pg_publication
       WHERE pubname = 'supabase_realtime' AND NOT puballtables)
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;


-- 7. get_review_reminders(p_days): MY posts that are at least p_days old and
--    have no review of mine, newest first, at most 50. The client passes the
--    number of days (REVIEW_REMINDER_DAYS), so it lives in a single place and
--    there is deliberately no default here. SECURITY INVOKER: RLS applies, and
--    a user without a session gets nothing (auth.uid() is null).
--    days_since is the number of whole days since the post was published.
CREATE OR REPLACE FUNCTION public.get_review_reminders(p_days int)
RETURNS TABLE (
  id          uuid,
  product     text,
  created_at  timestamptz,
  days_since  int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id,
         p.product,
         p.created_at,
         floor(extract(epoch FROM (now() - p.created_at)) / 86400)::int
  FROM posts p
  WHERE p.user_id = auth.uid()
    AND p.created_at <= now() - make_interval(days => greatest(p_days, 1))
    AND NOT EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.post_id = p.id
        AND r.user_id = auth.uid()
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT 50
$$;

--    Not in your list: the review lookup above is by post and user, and the
--    reviews table has no index for that.
CREATE INDEX IF NOT EXISTS idx_reviews_post_user
  ON public.reviews (post_id, user_id);


-- 8. Permissions. Nobody needs EXECUTE on the trigger functions (firing a
--    trigger does not check it). The reminders RPC is for signed-in users.
REVOKE EXECUTE ON FUNCTION public.notify_on_like()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_review_reminders(int)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_review_reminders(int)
  TO authenticated;


COMMIT;

-- Right after the COMMIT, this shows what the backfill created. The unread
-- column must be 0 (everything from the backfill is marked as read).
SELECT type AS notif_type,
       count(*) AS notif_total,
       count(*) FILTER (WHERE read_at IS NULL) AS notif_unread
FROM public.notifications
GROUP BY type
ORDER BY type;


-- 9. How to test it as a real user.
--    Two users are needed. Replace:
--      <USER_UUID>    user A, who the test starts as
--      <OTHER_UUID>   user B, who owns <POST_B_UUID> and receives the
--                     notifications. A must NOT follow B yet.
--      <POST_B_UUID>  a post of B that A has not liked
--      <POST_A_UUID>  a post of A that A has not liked
--    Run everything between BEGIN and ROLLBACK as ONE script. set_config with
--    `true` only lasts for the current transaction and ROLLBACK leaves your
--    data untouched. The test switches identity between A and B by changing
--    the claims. Each step writes into a temporary log and the last SELECT
--    shows it, every column with its own alias. If your editor shows only the
--    last result and the ROLLBACK hides it, delete the ROLLBACK line, read the
--    table, then run ROLLBACK; on its own.
--
--    BEGIN;
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<USER_UUID>","role":"authenticated"}', true);
--      SET LOCAL ROLE authenticated;
--      CREATE TEMP TABLE test_log (n serial, step text, val int, note text)
--        ON COMMIT DROP;
--
--      -- As A: like, comment on and follow B. Also like and comment on A's
--      -- own post: those must not notify anybody.
--      INSERT INTO likes (post_id, user_id)
--        VALUES ('<POST_B_UUID>', '<USER_UUID>');
--      INSERT INTO comments (post_id, user_id, content)
--        VALUES ('<POST_B_UUID>', '<USER_UUID>', 'notif test');
--      INSERT INTO follows (follower_id, following_id)
--        VALUES ('<USER_UUID>', '<OTHER_UUID>');
--      INSERT INTO likes (post_id, user_id)
--        VALUES ('<POST_A_UUID>', '<USER_UUID>');
--      INSERT INTO comments (post_id, user_id, content)
--        VALUES ('<POST_A_UUID>', '<USER_UUID>', 'notif self test');
--      INSERT INTO test_log (step, val)
--        SELECT '01 notifications_a_got_from_a (= 0)', count(*)::int
--        FROM notifications
--        WHERE user_id = '<USER_UUID>' AND actor_id = '<USER_UUID>';
--
--      -- Now as B: B sees what A did.
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<OTHER_UUID>","role":"authenticated"}', true);
--      INSERT INTO test_log (step, val)
--        SELECT '02 b_like_from_a (= 1)', count(*)::int FROM notifications
--        WHERE user_id = '<OTHER_UUID>' AND actor_id = '<USER_UUID>'
--          AND type = 'like' AND post_id = '<POST_B_UUID>';
--      INSERT INTO test_log (step, val, note)
--        SELECT '03 b_comment_from_a (= 1, note = notif test)',
--               count(*)::int, max(preview)
--        FROM notifications
--        WHERE user_id = '<OTHER_UUID>' AND actor_id = '<USER_UUID>'
--          AND type = 'comment' AND post_id = '<POST_B_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '04 b_follow_from_a (= 1)', count(*)::int FROM notifications
--        WHERE user_id = '<OTHER_UUID>' AND actor_id = '<USER_UUID>'
--          AND type = 'follow';
--      INSERT INTO test_log (step, val)
--        SELECT '05 b_unread_from_a (= 3)', count(*)::int FROM notifications
--        WHERE user_id = '<OTHER_UUID>' AND actor_id = '<USER_UUID>'
--          AND read_at IS NULL;
--
--      -- B marks them as read (the only column a user may update).
--      WITH u AS (
--        UPDATE notifications SET read_at = now()
--        WHERE user_id = '<OTHER_UUID>' AND actor_id = '<USER_UUID>'
--          AND read_at IS NULL
--        RETURNING 1)
--      INSERT INTO test_log (step, val)
--        SELECT '06 b_marked_as_read (= 3)', count(*)::int FROM u;
--      INSERT INTO test_log (step, val)
--        SELECT '07 b_unread_from_a_after (= 0)', count(*)::int
--        FROM notifications
--        WHERE user_id = '<OTHER_UUID>' AND actor_id = '<USER_UUID>'
--          AND read_at IS NULL;
--
--      -- B must NOT be able to change the content, insert or delete.
--      -- Each attempt is caught: 0 = blocked (good), 1 = it went through.
--      DO $$
--      BEGIN
--        BEGIN
--          UPDATE notifications SET preview = 'hacked'
--            WHERE user_id = '<OTHER_UUID>';
--          INSERT INTO test_log (step, val)
--            VALUES ('08 b_changed_preview (= 0)', 1);
--        EXCEPTION WHEN insufficient_privilege THEN
--          INSERT INTO test_log (step, val)
--            VALUES ('08 b_changed_preview (= 0)', 0);
--        END;
--        BEGIN
--          INSERT INTO notifications (user_id, actor_id, type)
--            VALUES ('<USER_UUID>', '<OTHER_UUID>', 'follow');
--          INSERT INTO test_log (step, val)
--            VALUES ('09 b_inserted_one (= 0)', 1);
--        EXCEPTION WHEN insufficient_privilege THEN
--          INSERT INTO test_log (step, val)
--            VALUES ('09 b_inserted_one (= 0)', 0);
--        END;
--        BEGIN
--          DELETE FROM notifications WHERE user_id = '<OTHER_UUID>';
--          INSERT INTO test_log (step, val)
--            VALUES ('10 b_deleted_own (= 0)', 1);
--        EXCEPTION WHEN insufficient_privilege THEN
--          INSERT INTO test_log (step, val)
--            VALUES ('10 b_deleted_own (= 0)', 0);
--        END;
--      END
--      $$;
--
--      -- Back to A: A must not read, insert or touch B's notifications.
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<USER_UUID>","role":"authenticated"}', true);
--      INSERT INTO test_log (step, val)
--        SELECT '11 a_sees_b_notifications (= 0)', count(*)::int
--        FROM notifications WHERE user_id = '<OTHER_UUID>';
--      DO $$
--      BEGIN
--        BEGIN
--          INSERT INTO notifications (user_id, actor_id, type)
--            VALUES ('<OTHER_UUID>', '<USER_UUID>', 'follow');
--          INSERT INTO test_log (step, val)
--            VALUES ('12 a_inserted_for_b (= 0)', 1);
--        EXCEPTION WHEN insufficient_privilege THEN
--          INSERT INTO test_log (step, val)
--            VALUES ('12 a_inserted_for_b (= 0)', 0);
--        END;
--      END
--      $$;
--      WITH u AS (
--        UPDATE notifications SET read_at = NULL
--        WHERE user_id = '<OTHER_UUID>'
--        RETURNING 1)
--      INSERT INTO test_log (step, val)
--        SELECT '13 a_updated_b_rows (= 0)', count(*)::int FROM u;
--
--      -- A undoes everything: the notifications must disappear.
--      DELETE FROM likes WHERE user_id = '<USER_UUID>'
--        AND post_id IN ('<POST_B_UUID>', '<POST_A_UUID>');
--      DELETE FROM comments WHERE user_id = '<USER_UUID>'
--        AND content IN ('notif test', 'notif self test');
--      DELETE FROM follows WHERE follower_id = '<USER_UUID>'
--        AND following_id = '<OTHER_UUID>';
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<OTHER_UUID>","role":"authenticated"}', true);
--      INSERT INTO test_log (step, val)
--        SELECT '14 b_notifications_from_a_after_undo (= 0)', count(*)::int
--        FROM notifications
--        WHERE user_id = '<OTHER_UUID>' AND actor_id = '<USER_UUID>';
--
--      -- Review reminders, as A, with the 30 days the client will pass.
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<USER_UUID>","role":"authenticated"}', true);
--      INSERT INTO test_log (step, val)
--        SELECT '15 reminders_from_rpc', count(*)::int
--        FROM get_review_reminders(30);
--      INSERT INTO test_log (step, val)
--        SELECT '16 reminders_counted_by_hand (= 15)', least(count(*), 50)::int
--        FROM posts p
--        WHERE p.user_id = '<USER_UUID>'
--          AND p.created_at <= now() - interval '30 days'
--          AND NOT EXISTS (SELECT 1 FROM reviews r
--            WHERE r.post_id = p.id AND r.user_id = '<USER_UUID>');
--      INSERT INTO test_log (step, val)
--        SELECT '17 reminders_of_other_users (= 0)', count(*)::int
--        FROM get_review_reminders(30) rr JOIN posts p ON p.id = rr.id
--        WHERE p.user_id <> '<USER_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '18 reminders_with_a_100_year_window (= 0)', count(*)::int
--        FROM get_review_reminders(36500);
--
--      SELECT t.n AS step_no, t.step AS step_name, t.val AS step_value,
--             t.note AS step_note
--      FROM test_log t ORDER BY t.n;
--    ROLLBACK;
--
--    anon must not read the table or call the RPC (expect "permission
--    denied" each time):
--
--    BEGIN;
--      SET LOCAL ROLE anon;
--      SELECT count(*) AS anon_rows FROM notifications;
--    ROLLBACK;
--
--    BEGIN;
--      SET LOCAL ROLE anon;
--      SELECT * FROM get_review_reminders(30);
--    ROLLBACK;
--
--    Outside of a transaction, as postgres, check Realtime and the policies.
--    Expected: one row for the publication, and exactly two policies (SELECT
--    and UPDATE), none for INSERT:
--
--      SELECT tablename AS in_realtime FROM pg_publication_tables
--      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
--
--      SELECT policyname AS policy_name, cmd AS policy_cmd FROM pg_policies
--      WHERE tablename = 'notifications' ORDER BY policyname;
