-- Migration 006: counters kept by triggers (likes, comments, followers).
--
-- Adds four counters and keeps them exact with triggers, so reading them is a
-- column read instead of counting rows:
--   posts.likes_count       likes of the post
--   posts.comments_count    comments of the post
--   profiles.followers_count  users that follow the profile
--   profiles.following_count  users the profile follows
--
-- Also: a guard so a client cannot write the counters directly (the owner
-- of a post or profile may edit any other column, so RLS does not stop it),
-- recount_all_counters() to repair any drift, an exact backfill of the
-- existing data, and get_feed reading posts.likes_count instead of counting
-- likes for every post of every page (same signature and result).
--
-- Whole migration runs in ONE transaction: it either applies fully or not at
-- all. If you run it statement by statement instead, run the LOCK and the
-- recount (section 5) together inside a single transaction.
--
-- Counter triggers do NOT swallow errors on purpose: a counter that fails to
-- update should fail loudly, not drift quietly.
--
-- Not covered: TRUNCATE on likes, comments or follows, and rows edited by
-- hand with the triggers disabled. Run recount_all_counters() after those.
--
-- ROLLBACK (run manually, in this order):
--   -- 1. Put get_feed back first: it reads likes_count. Re-run the
--   --    CREATE OR REPLACE FUNCTION public.get_feed block of
--   --    002_get_feed.sql.
--   -- 2. Triggers:
--   DROP TRIGGER IF EXISTS trg_likes_count ON public.likes;
--   DROP TRIGGER IF EXISTS trg_comments_count ON public.comments;
--   DROP TRIGGER IF EXISTS trg_follows_count ON public.follows;
--   DROP TRIGGER IF EXISTS trg_guard_posts_counters_ins ON public.posts;
--   DROP TRIGGER IF EXISTS trg_guard_posts_counters_upd ON public.posts;
--   DROP TRIGGER IF EXISTS trg_guard_profiles_counters_ins ON public.profiles;
--   DROP TRIGGER IF EXISTS trg_guard_profiles_counters_upd ON public.profiles;
--   -- 3. Functions:
--   DROP FUNCTION IF EXISTS public.likes_count_trg();
--   DROP FUNCTION IF EXISTS public.comments_count_trg();
--   DROP FUNCTION IF EXISTS public.follows_count_trg();
--   DROP FUNCTION IF EXISTS public.guard_posts_counters();
--   DROP FUNCTION IF EXISTS public.guard_profiles_counters();
--   DROP FUNCTION IF EXISTS public.recount_all_counters();
--   -- 4. Columns:
--   ALTER TABLE public.posts DROP COLUMN IF EXISTS likes_count,
--     DROP COLUMN IF EXISTS comments_count;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS followers_count,
--     DROP COLUMN IF EXISTS following_count;

BEGIN;


-- 1. Columns. A constant DEFAULT is added without rewriting the table.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;


-- 2. Guard: a client must not write the counters.
--    RLS lets the owner of a post or profile update (and insert) ANY column,
--    so without this a user could set their own likes_count to 9999. Requests
--    from the app run as the roles authenticated / anon: for them the counters
--    are forced to 0 on INSERT and kept as they were on UPDATE. The counter
--    triggers below are SECURITY DEFINER (they run as the function owner), the
--    backfill runs as postgres and service_role is not listed, so all of those
--    are allowed. These guard functions are NOT SECURITY DEFINER on purpose:
--    they must see the role that issued the statement.
CREATE OR REPLACE FUNCTION public.guard_posts_counters()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.likes_count := 0;
      NEW.comments_count := 0;
    ELSE
      NEW.likes_count := OLD.likes_count;
      NEW.comments_count := OLD.comments_count;
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.guard_profiles_counters()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.followers_count := 0;
      NEW.following_count := 0;
    ELSE
      NEW.followers_count := OLD.followers_count;
      NEW.following_count := OLD.following_count;
    END IF;
  END IF;
  RETURN NEW;
END
$$;

-- On UPDATE the guard only fires when a counter would change, so ordinary
-- edits of a post or a profile do not pay for it.
DROP TRIGGER IF EXISTS trg_guard_posts_counters_ins ON public.posts;
CREATE TRIGGER trg_guard_posts_counters_ins
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_posts_counters();

DROP TRIGGER IF EXISTS trg_guard_posts_counters_upd ON public.posts;
CREATE TRIGGER trg_guard_posts_counters_upd
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  WHEN (OLD.likes_count IS DISTINCT FROM NEW.likes_count
     OR OLD.comments_count IS DISTINCT FROM NEW.comments_count)
  EXECUTE FUNCTION public.guard_posts_counters();

DROP TRIGGER IF EXISTS trg_guard_profiles_counters_ins ON public.profiles;
CREATE TRIGGER trg_guard_profiles_counters_ins
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_counters();

DROP TRIGGER IF EXISTS trg_guard_profiles_counters_upd ON public.profiles;
CREATE TRIGGER trg_guard_profiles_counters_upd
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.followers_count IS DISTINCT FROM NEW.followers_count
     OR OLD.following_count IS DISTINCT FROM NEW.following_count)
  EXECUTE FUNCTION public.guard_profiles_counters();


-- 3. Counter triggers. SECURITY DEFINER so they can update posts and profiles
--    that belong to other users, with a fixed search_path. They only use the
--    values of the row that fired them. A count never goes below 0. Cascade
--    deletes (a deleted post removes its likes and comments, a deleted profile
--    removes its follows) fire these triggers too, so they stay exact.
CREATE OR REPLACE FUNCTION public.likes_count_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = greatest(likes_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION public.comments_count_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = greatest(comments_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END
$$;

-- A follow changes two profiles. Both are updated in ONE statement so that two
-- people following each other at the same moment lock the rows in the same
-- order instead of waiting for each other (a deadlock). Following yourself,
-- if it ever happens, counts once on each side.
CREATE OR REPLACE FUNCTION public.follows_count_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET followers_count = followers_count
          + (CASE WHEN id = NEW.following_id THEN 1 ELSE 0 END),
        following_count = following_count
          + (CASE WHEN id = NEW.follower_id THEN 1 ELSE 0 END)
    WHERE id IN (NEW.following_id, NEW.follower_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET followers_count = greatest(followers_count
          - (CASE WHEN id = OLD.following_id THEN 1 ELSE 0 END), 0),
        following_count = greatest(following_count
          - (CASE WHEN id = OLD.follower_id THEN 1 ELSE 0 END), 0)
    WHERE id IN (OLD.following_id, OLD.follower_id);
  END IF;
  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_likes_count ON public.likes;
CREATE TRIGGER trg_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.likes_count_trg();

DROP TRIGGER IF EXISTS trg_comments_count ON public.comments;
CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.comments_count_trg();

DROP TRIGGER IF EXISTS trg_follows_count ON public.follows;
CREATE TRIGGER trg_follows_count
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.follows_count_trg();


-- 4. recount_all_counters(): recalculates every counter from the real rows and
--    only touches the ones that are wrong. It is the backfill below AND the
--    repair tool: run it any time (select * from recount_all_counters()) to
--    fix a drift. It returns, per counter, how many rows it had to correct, so
--    all zeros means everything was already right. Idempotent. Not callable by
--    the app (see the permissions section).
CREATE OR REPLACE FUNCTION public.recount_all_counters()
RETURNS TABLE (counter text, rows_fixed bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  UPDATE public.posts p
  SET likes_count = x.total
  FROM (SELECT p2.id, count(l.id)::int AS total
        FROM public.posts p2
        LEFT JOIN public.likes l ON l.post_id = p2.id
        GROUP BY p2.id) x
  WHERE x.id = p.id AND p.likes_count IS DISTINCT FROM x.total;
  GET DIAGNOSTICS n = ROW_COUNT;
  counter := 'posts.likes_count'; rows_fixed := n; RETURN NEXT;

  UPDATE public.posts p
  SET comments_count = x.total
  FROM (SELECT p2.id, count(c.id)::int AS total
        FROM public.posts p2
        LEFT JOIN public.comments c ON c.post_id = p2.id
        GROUP BY p2.id) x
  WHERE x.id = p.id AND p.comments_count IS DISTINCT FROM x.total;
  GET DIAGNOSTICS n = ROW_COUNT;
  counter := 'posts.comments_count'; rows_fixed := n; RETURN NEXT;

  UPDATE public.profiles pr
  SET followers_count = x.total
  FROM (SELECT p2.id, count(f.id)::int AS total
        FROM public.profiles p2
        LEFT JOIN public.follows f ON f.following_id = p2.id
        GROUP BY p2.id) x
  WHERE x.id = pr.id AND pr.followers_count IS DISTINCT FROM x.total;
  GET DIAGNOSTICS n = ROW_COUNT;
  counter := 'profiles.followers_count'; rows_fixed := n; RETURN NEXT;

  UPDATE public.profiles pr
  SET following_count = x.total
  FROM (SELECT p2.id, count(f.id)::int AS total
        FROM public.profiles p2
        LEFT JOIN public.follows f ON f.follower_id = p2.id
        GROUP BY p2.id) x
  WHERE x.id = pr.id AND pr.following_count IS DISTINCT FROM x.total;
  GET DIAGNOSTICS n = ROW_COUNT;
  counter := 'profiles.following_count'; rows_fixed := n; RETURN NEXT;
END
$$;


-- 5. Backfill of the existing data. The triggers already exist, so a like
--    inserted while the recount runs could be counted twice or lost. The LOCK
--    makes writers on these three tables wait for the few moments it takes
--    (readers are not blocked); it is released at COMMIT.
LOCK TABLE public.likes, public.comments, public.follows
  IN SHARE ROW EXCLUSIVE MODE;

SELECT * FROM public.recount_all_counters();


-- 6. get_feed now reads posts.likes_count instead of counting the likes of
--    every post of every page. Same signature, same columns, same result: the
--    only change is the like_count line. It is the body of 002_get_feed.sql
--    with that one line replaced. The grants of 002 are kept by CREATE OR
--    REPLACE and repeated in section 7. The backfill above already ran, so
--    the counts it reads are exact.
CREATE OR REPLACE FUNCTION public.get_feed(
  p_limit             int         DEFAULT 10,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         uuid        DEFAULT NULL
)
RETURNS TABLE (
  id            uuid,
  user_id       uuid,
  product       text,
  brand         text,
  price         text,
  where_bought  text,
  caption       text,
  emoji         text,
  created_at    timestamptz,
  image_url     text,
  for_sale      boolean,
  sale_price    text,
  category      text,
  image_urls    text[],
  profiles      jsonb,
  like_count    bigint,
  liked_by_me   boolean,
  saved_by_me   boolean,
  has_more      boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  cfg AS (
    SELECT least(greatest(coalesce(p_limit, 10), 1), 50) AS n,
           auth.uid()                                     AS uid
  ),
  -- Me + the people I follow, excluding the ones I blocked.
  -- If there is no session, uid is NULL and nothing matches: the result is empty.
  authors AS (
    SELECT cfg.uid AS user_id FROM cfg
    UNION
    SELECT f.following_id
    FROM follows f, cfg
    WHERE f.follower_id = cfg.uid
      AND NOT EXISTS (
        SELECT 1 FROM blocked_users b
        WHERE b.blocker_id = cfg.uid
          AND b.blocked_id = f.following_id
      )
  ),
  -- One extra row (n + 1) only to detect whether another page exists.
  page AS (
    SELECT p.*
    FROM posts p
    JOIN authors a ON a.user_id = p.user_id
    WHERE p_cursor_created_at IS NULL
       OR (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id)
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT (SELECT n + 1 FROM cfg)
  ),
  numbered AS (
    SELECT page.*,
           row_number() OVER (ORDER BY page.created_at DESC, page.id DESC) AS rn,
           count(*)     OVER ()                                            AS total
    FROM page
  )
  SELECT
    p.id,
    p.user_id,
    p.product,
    p.brand,
    p.price,
    p.where_bought,
    p.caption,
    p.emoji,
    p.created_at,
    p.image_url,
    p.for_sale,
    p.sale_price,
    p.category,
    p.image_urls,
    CASE WHEN pr.id IS NULL THEN NULL
         ELSE jsonb_build_object('username', pr.username, 'avatar_url', pr.avatar_url)
    END,
    p.likes_count::bigint,
    EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = cfg.uid),
    EXISTS (SELECT 1 FROM saves s WHERE s.post_id = p.id AND s.user_id = cfg.uid),
    p.total > cfg.n
  FROM numbered p
  CROSS JOIN cfg
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE p.rn <= cfg.n
  ORDER BY p.rn
$$;


-- 7. Permissions. The trigger functions are only ever run by the triggers, and
--    firing a trigger does not need EXECUTE on its function, so nobody gets it.
--    recount_all_counters() is for you (postgres) and service_role only.
REVOKE EXECUTE ON FUNCTION public.likes_count_trg()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.comments_count_trg()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.follows_count_trg()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_posts_counters()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profiles_counters()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recount_all_counters()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_feed(int, timestamptz, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed(int, timestamptz, uuid)
  TO authenticated;


COMMIT;

-- Right after the COMMIT, run the recount again: it must report 0 fixed rows
-- for every counter (the backfill was exact and nothing has drifted).
SELECT * FROM public.recount_all_counters();

-- 8. How to test it as a real user.
--    Replace:
--      <USER_UUID>     the user the test acts as
--      <OTHER_UUID>    another user that <USER_UUID> does NOT follow yet
--      <POST_UUID>     any post (one of <OTHER_UUID> is fine)
--      <MY_POST_UUID>  a post of <USER_UUID>
--    Run everything between BEGIN and ROLLBACK as ONE script. set_config with
--    `true` only lasts for the current transaction and ROLLBACK leaves your
--    data untouched. Each step writes its value into a temporary log and the
--    last SELECT shows the whole log, every column with its own alias. If your
--    editor shows only the last result and the ROLLBACK hides it, delete the
--    ROLLBACK line, read the table, then run ROLLBACK; on its own.
--
--    BEGIN;
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<USER_UUID>","role":"authenticated"}', true);
--      SET LOCAL ROLE authenticated;
--      CREATE TEMP TABLE test_log (n serial, step text, val int)
--        ON COMMIT DROP;
--
--      -- Likes: +1 when liked, back to the start when unliked.
--      INSERT INTO test_log (step, val)
--        SELECT '01 likes_start', likes_count FROM posts
--        WHERE id = '<POST_UUID>';
--      INSERT INTO likes (post_id, user_id)
--        VALUES ('<POST_UUID>', '<USER_UUID>');
--      INSERT INTO test_log (step, val)
--        SELECT '02 likes_after_like (start + 1)', likes_count FROM posts
--        WHERE id = '<POST_UUID>';
--      DELETE FROM likes
--        WHERE post_id = '<POST_UUID>' AND user_id = '<USER_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '03 likes_after_unlike (= start)', likes_count FROM posts
--        WHERE id = '<POST_UUID>';
--
--      -- Comments: +1 when commented, back to the start when deleted.
--      INSERT INTO test_log (step, val)
--        SELECT '04 comments_start', comments_count FROM posts
--        WHERE id = '<POST_UUID>';
--      INSERT INTO comments (post_id, user_id, content)
--        VALUES ('<POST_UUID>', '<USER_UUID>', 'counter test');
--      INSERT INTO test_log (step, val)
--        SELECT '05 comments_after_insert (start + 1)', comments_count
--        FROM posts WHERE id = '<POST_UUID>';
--      DELETE FROM comments
--        WHERE post_id = '<POST_UUID>' AND user_id = '<USER_UUID>'
--          AND content = 'counter test';
--      INSERT INTO test_log (step, val)
--        SELECT '06 comments_after_delete (= start)', comments_count
--        FROM posts WHERE id = '<POST_UUID>';
--
--      -- Follows: the followed profile gains a follower and the follower
--      -- gains a "following"; both come back on unfollow.
--      INSERT INTO test_log (step, val)
--        SELECT '07 other_followers_start', followers_count FROM profiles
--        WHERE id = '<OTHER_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '08 my_following_start', following_count FROM profiles
--        WHERE id = '<USER_UUID>';
--      INSERT INTO follows (follower_id, following_id)
--        VALUES ('<USER_UUID>', '<OTHER_UUID>');
--      INSERT INTO test_log (step, val)
--        SELECT '09 other_followers_after_follow (+1)', followers_count
--        FROM profiles WHERE id = '<OTHER_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '10 my_following_after_follow (+1)', following_count
--        FROM profiles WHERE id = '<USER_UUID>';
--      DELETE FROM follows
--        WHERE follower_id = '<USER_UUID>' AND following_id = '<OTHER_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '11 other_followers_after_unfollow (= 07)', followers_count
--        FROM profiles WHERE id = '<OTHER_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '12 my_following_after_unfollow (= 08)', following_count
--        FROM profiles WHERE id = '<USER_UUID>';
--
--      -- The guard: writing a counter from the app has no effect.
--      INSERT INTO test_log (step, val)
--        SELECT '13 my_post_likes_before_tamper', likes_count FROM posts
--        WHERE id = '<MY_POST_UUID>';
--      UPDATE posts SET likes_count = 9999 WHERE id = '<MY_POST_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '14 my_post_likes_after_tamper (= 13)', likes_count
--        FROM posts WHERE id = '<MY_POST_UUID>';
--      UPDATE profiles SET followers_count = 9999 WHERE id = '<USER_UUID>';
--      INSERT INTO test_log (step, val)
--        SELECT '15 my_followers_after_tamper (not 9999)', followers_count
--        FROM profiles WHERE id = '<USER_UUID>';
--      WITH ins AS (
--        INSERT INTO posts (user_id, product, likes_count)
--        VALUES ('<USER_UUID>', 'guard test', 500) RETURNING likes_count)
--      INSERT INTO test_log (step, val)
--        SELECT '16 new_post_likes_when_inserting_500 (= 0)', likes_count
--        FROM ins;
--
--      -- Consistency: how many rows disagree with the real data (all 0).
--      INSERT INTO test_log (step, val)
--        SELECT '17 posts_with_wrong_likes (= 0)', count(*)::int FROM posts p
--        WHERE p.likes_count <>
--          (SELECT count(*) FROM likes l WHERE l.post_id = p.id);
--      INSERT INTO test_log (step, val)
--        SELECT '18 posts_with_wrong_comments (= 0)', count(*)::int
--        FROM posts p WHERE p.comments_count <>
--          (SELECT count(*) FROM comments c WHERE c.post_id = p.id);
--      INSERT INTO test_log (step, val)
--        SELECT '19 profiles_with_wrong_followers (= 0)', count(*)::int
--        FROM profiles pr WHERE pr.followers_count <>
--          (SELECT count(*) FROM follows f WHERE f.following_id = pr.id);
--      INSERT INTO test_log (step, val)
--        SELECT '20 profiles_with_wrong_following (= 0)', count(*)::int
--        FROM profiles pr WHERE pr.following_count <>
--          (SELECT count(*) FROM follows f WHERE f.follower_id = pr.id);
--      INSERT INTO test_log (step, val)
--        SELECT '21 feed_rows_with_wrong_like_count (= 0)', count(*)::int
--        FROM get_feed(50) gf JOIN posts p ON p.id = gf.id
--        WHERE gf.like_count <> p.likes_count;
--
--      SELECT t.n AS step_no, t.step AS step_name, t.val AS step_value
--      FROM test_log t ORDER BY t.n;
--    ROLLBACK;
--
--    The app must not be able to run the repair function (expect
--    "permission denied for function recount_all_counters"):
--
--    BEGIN;
--      SET LOCAL ROLE authenticated;
--      SELECT * FROM recount_all_counters();
--    ROLLBACK;
--
--    Repair at any time, as postgres, outside of a transaction:
--
--      SELECT * FROM recount_all_counters();
