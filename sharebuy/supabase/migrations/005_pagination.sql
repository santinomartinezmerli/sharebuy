-- Migration 005: get_conversations() and the indexes of the paginated lists.
--
-- The Messages screen loaded every conversation, every blocked user and up
-- to 1000 messages to work out the last message and the unread count of each
-- conversation. Past 1000 messages some conversations lost their last message
-- and the counts were capped. get_conversations returns one page of
-- conversations with everything the list needs, in a single request.
--
-- The indexes back the keyset-paginated queries the client already runs:
-- chat messages, comments, followers / following and saved posts.
--
-- Re-runnable: CREATE OR REPLACE / IF NOT EXISTS. CREATE OR REPLACE cannot
-- change a RETURNS TABLE shape; DROP the function first if you change it.
--
-- ROLLBACK (run manually):
--   DROP FUNCTION IF EXISTS public.get_conversations(int, timestamptz, uuid,
--     jsonb);
--   DROP INDEX IF EXISTS public.idx_messages_conv_created_id;
--   DROP INDEX IF EXISTS public.idx_comments_post_created_id;
--   DROP INDEX IF EXISTS public.idx_follows_following_created_id;
--   DROP INDEX IF EXISTS public.idx_follows_follower_created_id;
--   DROP INDEX IF EXISTS public.idx_saves_user_created_id;


-- 1. Indexes. Plain CREATE INDEX (not CONCURRENTLY) because the Supabase SQL
--    editor runs a transaction; on very large tables run them CONCURRENTLY.
--    The older single-column indexes are left alone; the composites below
--    make some of them redundant and they can be dropped later.

-- 1a. Messages of a conversation, newest first. Serves the chat pages, the
--     last message of each conversation and the unread count.
CREATE INDEX IF NOT EXISTS idx_messages_conv_created_id
  ON public.messages (conversation_id, created_at DESC, id DESC);

-- 1b. Comments of a post, OLDEST first (the order the screens show).
CREATE INDEX IF NOT EXISTS idx_comments_post_created_id
  ON public.comments (post_id, created_at ASC, id ASC);

-- 1c. Followers of a user (follows.following_id) and the users a user
--     follows (follows.follower_id), most recent follow first.
CREATE INDEX IF NOT EXISTS idx_follows_following_created_id
  ON public.follows (following_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_follows_follower_created_id
  ON public.follows (follower_id, created_at DESC, id DESC);

-- 1d. Not in the original list: posts a user saved, most recently saved
--     first. The "Guardados" tab already paginates on (created_at, id).
CREATE INDEX IF NOT EXISTS idx_saves_user_created_id
  ON public.saves (user_id, created_at DESC, id DESC);


-- 2. get_conversations: one page of the conversation list, most recently
--    active first.
--
--    Usage: select * from get_conversations(20, p_last_read => '{}');
--           select * from get_conversations(20, '<last_message_at>',
--                                           '<id>', '{}');
--
--    - Conversations with a user I blocked are not returned (same rule as the
--      old client). So are conversations whose other user has no profile.
--    - Ordered by last_message_at (the date of the last message, or the date
--      the conversation was created if it has none) and then id. Keyset
--      pagination: send BOTH cursor values, taken from the last row of the
--      previous page. A null cursor means the first page.
--    - p_last_read is the map the client keeps in localStorage:
--      { "<conversation id>": <epoch milliseconds when it was last read> }.
--      unread_count counts the messages the OTHER user sent after that date.
--      A conversation missing from the map, or with a value that is not a
--      number, counts all of the other user's messages. There is no cap.
--    - Fetches limit + 1 conversations and returns `limit`; has_more is the
--      same value on every returned row. p_limit is clamped to 1..50.
--    - SECURITY INVOKER: RLS applies to the caller.
--    - other_user is {id, username, avatar_url}; last_message is
--      {id, sender_id, content, created_at} or null.
--    - Scale note: the last message is looked up for each of the user's
--      conversations before the page is cut. Each lookup is one index probe
--      (idx_messages_conv_created_id), fine for hundreds of conversations.
CREATE OR REPLACE FUNCTION public.get_conversations(
  p_limit                   int         DEFAULT 20,
  p_cursor_last_message_at  timestamptz DEFAULT NULL,
  p_cursor_id               uuid        DEFAULT NULL,
  p_last_read               jsonb       DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id               uuid,
  user1_id         uuid,
  user2_id         uuid,
  created_at       timestamptz,
  other_user       jsonb,
  last_message     jsonb,
  last_message_at  timestamptz,
  unread_count     bigint,
  has_more         boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  cfg AS (
    SELECT least(greatest(coalesce(p_limit, 20), 1), 50) AS n,
           auth.uid()                                     AS uid
  ),
  mine AS (
    SELECT c.id, c.user1_id, c.user2_id, c.created_at,
           CASE WHEN c.user1_id = cfg.uid THEN c.user2_id
                ELSE c.user1_id END                       AS other_id
    FROM conversations c
    CROSS JOIN cfg
    WHERE cfg.uid IS NOT NULL
      AND (c.user1_id = cfg.uid OR c.user2_id = cfg.uid)
  ),
  visible AS (
    SELECT m.id, m.user1_id, m.user2_id, m.created_at, m.other_id,
           pr.username                                    AS other_username,
           pr.avatar_url                                  AS other_avatar,
           lm.id                                          AS lm_id,
           lm.sender_id                                   AS lm_sender,
           lm.content                                     AS lm_content,
           lm.created_at                                  AS lm_created_at,
           coalesce(lm.created_at, m.created_at)          AS last_at
    FROM mine m
    CROSS JOIN cfg
    JOIN profiles pr ON pr.id = m.other_id
    LEFT JOIN LATERAL (
      SELECT msg.id, msg.sender_id, msg.content, msg.created_at
      FROM messages msg
      WHERE msg.conversation_id = m.id
      ORDER BY msg.created_at DESC, msg.id DESC
      LIMIT 1
    ) lm ON true
    WHERE NOT EXISTS (
      SELECT 1 FROM blocked_users b
      WHERE b.blocker_id = cfg.uid
        AND b.blocked_id = m.other_id
    )
  ),
  -- One extra row (n + 1) only to detect whether another page exists.
  page AS (
    SELECT v.*
    FROM visible v
    WHERE p_cursor_last_message_at IS NULL
       OR (v.last_at, v.id) < (p_cursor_last_message_at, p_cursor_id)
    ORDER BY v.last_at DESC, v.id DESC
    LIMIT (SELECT n + 1 FROM cfg)
  ),
  numbered AS (
    SELECT page.*,
           row_number() OVER (ORDER BY page.last_at DESC, page.id DESC)
                                                          AS rn,
           count(*) OVER ()                               AS total
    FROM page
  )
  SELECT
    p.id,
    p.user1_id,
    p.user2_id,
    p.created_at,
    jsonb_build_object('id', p.other_id,
                       'username', p.other_username,
                       'avatar_url', p.other_avatar),
    CASE WHEN p.lm_id IS NULL THEN NULL
         ELSE jsonb_build_object('id', p.lm_id,
                                 'sender_id', p.lm_sender,
                                 'content', p.lm_content,
                                 'created_at', p.lm_created_at)
    END,
    p.last_at,
    (SELECT count(*)
     FROM messages mm
     WHERE mm.conversation_id = p.id
       AND mm.sender_id <> cfg.uid
       AND mm.created_at > coalesce(
             CASE WHEN jsonb_typeof(p_last_read -> (p.id)::text) = 'number'
                  THEN to_timestamp(
                         ((p_last_read ->> (p.id)::text)::numeric) / 1000.0)
             END,
             '-infinity'::timestamptz)),
    p.total > cfg.n
  FROM numbered p
  CROSS JOIN cfg
  WHERE p.rn <= cfg.n
  ORDER BY p.rn
$$;


-- 3. Permissions. Supabase grants EXECUTE on new functions to anon through
--    default privileges, so anon is revoked explicitly.
REVOKE EXECUTE ON FUNCTION public.get_conversations(int, timestamptz, uuid,
  jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_conversations(int, timestamptz, uuid,
  jsonb) TO authenticated;


-- 4. How to test it as a real user.
--    Replace <USER_UUID> with a user that has conversations and <OTHER_UUID>
--    with the other user of one of them. Run everything between BEGIN and
--    ROLLBACK as ONE script (set_config with `true` only lasts for the
--    current transaction). Every selected column has its own alias, so the
--    result grid never shows two columns with the same name.
--
--    BEGIN;
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<USER_UUID>","role":"authenticated"}', true);
--      SET LOCAL ROLE authenticated;
--
--      -- Page 1 (null cursor), two per page. Newest activity first;
--      -- more is true when there are more conversations.
--      SELECT gc.id                         AS conv_id,
--             gc.other_user ->> 'username'  AS other_name,
--             gc.last_message ->> 'content' AS last_text,
--             gc.last_message_at::text      AS last_at_txt,
--             gc.unread_count               AS unread,
--             gc.has_more                   AS more
--      FROM get_conversations(2, p_last_read => '{}'::jsonb) AS gc;
--
--      -- Page 2: paste last_at_txt and conv_id of the LAST row of page 1.
--      SELECT gc.id                         AS conv_id_p2,
--             gc.last_message_at::text      AS last_at_p2,
--             gc.has_more                   AS more_p2
--      FROM get_conversations(2, '<LAST_AT_TXT>'::timestamptz,
--                             '<CONV_ID>'::uuid) AS gc;
--
--      -- Unread map: mark one conversation as read right now. Its
--      -- unread_after_read must be 0; the others keep their count.
--      SELECT gc.id                         AS conv_id_read,
--             gc.unread_count               AS unread_after_read
--      FROM get_conversations(20, p_last_read => jsonb_build_object(
--             '<CONV_ID>',
--             (extract(epoch FROM now()) * 1000)::bigint)) AS gc;
--
--      -- A value that is not a number must not break the query: that
--      -- conversation just counts all of the other user's messages.
--      SELECT gc.id                         AS conv_id_junk,
--             gc.unread_count               AS unread_junk
--      FROM get_conversations(20, p_last_read => jsonb_build_object(
--             '<CONV_ID>', 'garbage')) AS gc;
--
--      -- Blocking: block <OTHER_UUID>; their conversation must vanish.
--      INSERT INTO blocked_users (blocker_id, blocked_id)
--      VALUES ('<USER_UUID>', '<OTHER_UUID>');
--      SELECT gc.id                         AS conv_id_after_block
--      FROM get_conversations(20) AS gc;
--
--      -- Plan: the lookups should use idx_messages_conv_created_id.
--      EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM get_conversations(20);
--    ROLLBACK;
--
--    anon must be blocked (expect "permission denied"):
--
--    BEGIN;
--      SET LOCAL ROLE anon;
--      SELECT gc.id AS conv_id_anon FROM get_conversations(2) AS gc;
--    ROLLBACK;
--
--    The five indexes should exist (run it outside the transaction):
--
--      SELECT indexname AS index_name FROM pg_indexes
--      WHERE schemaname = 'public' AND indexname IN (
--        'idx_messages_conv_created_id', 'idx_comments_post_created_id',
--        'idx_follows_following_created_id',
--        'idx_follows_follower_created_id', 'idx_saves_user_created_id');
