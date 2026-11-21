-- Migration 002: get_feed() RPC + composite index for the home feed.
--
-- Replaces the client-side feed logic (follows query + blocked query + posts query
-- + 3 requests per PostCard) with ONE request that returns posts, author profile,
-- like count and the caller's like/save state.
--
-- Safe to re-run: the index uses IF NOT EXISTS and the function uses CREATE OR REPLACE.
-- Note: CREATE OR REPLACE cannot change the RETURNS TABLE shape. If you change the
-- columns later, DROP FUNCTION first (see rollback).
--
-- ROLLBACK (run manually):
--   DROP FUNCTION IF EXISTS public.get_feed(int, timestamptz, uuid);
--   DROP INDEX IF EXISTS public.idx_posts_user_created;


-- 1. Index: "posts of these authors, newest first, keyset-paginated".
--    Existing idx_posts_user_id and idx_posts_created_at do not cover that combination.
--    Plain CREATE INDEX (not CONCURRENTLY) because the Supabase SQL editor runs a
--    transaction; on a very large posts table you would run it CONCURRENTLY instead.
CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON public.posts (user_id, created_at DESC, id DESC);


-- 2. The function.
--
--    Usage:   select * from get_feed(10);                              -- first page
--             select * from get_feed(10, '<last created_at>', '<last id>');  -- next page
--
--    - The caller is auth.uid(); the client cannot ask for somebody else's feed.
--    - Feed = my own posts + posts of users I follow, minus users I blocked.
--    - Keyset pagination on (created_at DESC, id DESC); id breaks ties. The client must
--      send BOTH cursor values, taken from the last row of the previous page.
--    - Fetches limit + 1 rows internally to know if there is another page, but only
--      returns `limit` rows. has_more is the same value on every returned row.
--    - p_limit is clamped to 1..50.
--    - SECURITY INVOKER: RLS applies to the caller (saves and blocked_users only expose
--      the caller's own rows, which is exactly what is needed here).
--    - profiles is a JSON object {username, avatar_url}: same shape the old PostgREST
--      embed returned, so PostCard, useStories and StoryViewer keep working unchanged.
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
    (SELECT count(*) FROM likes l WHERE l.post_id = p.id),
    EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = cfg.uid),
    EXISTS (SELECT 1 FROM saves s WHERE s.post_id = p.id AND s.user_id = cfg.uid),
    p.total > cfg.n
  FROM numbered p
  CROSS JOIN cfg
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE p.rn <= cfg.n
  ORDER BY p.rn
$$;


-- 3. Permissions. Supabase grants EXECUTE on new functions to anon and authenticated
--    through default privileges, so anon must be revoked explicitly.
REVOKE EXECUTE ON FUNCTION public.get_feed(int, timestamptz, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_feed(int, timestamptz, uuid) TO authenticated;


-- 4. How to test it as a real user.
--    In the SQL editor auth.uid() is NULL (you are the postgres role), so a
--    plain `select * from get_feed()` returns 0 rows. Impersonate a user inside
--    a transaction. Replace <USER_UUID> with an id from the profiles table and
--    run everything between BEGIN and ROLLBACK as ONE script (set_config with
--    `true` only lasts for the current transaction):
--
--    BEGIN;
--      SELECT set_config('request.jwt.claims',
--        '{"sub":"<USER_UUID>","role":"authenticated"}', true);
--      SET LOCAL ROLE authenticated;
--
--      -- Page 1 (null cursor): up to 3 rows. has_more is true when the
--      -- feed has more posts.
--      SELECT id, product, created_at::text AS created_at, like_count,
--             liked_by_me, saved_by_me, has_more
--      FROM get_feed(3);
--
--      -- Page 2: paste created_at and id of the LAST row of page 1.
--      -- created_at::text keeps the full microseconds.
--      SELECT id, product, created_at::text AS created_at, has_more
--      FROM get_feed(3, '<LAST_CREATED_AT>'::timestamptz, '<LAST_ID>'::uuid);
--
--      -- Is the index used, and how many rows does it touch?
--      EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM get_feed(10);
--    ROLLBACK;
--
--    Check that anon is blocked (expect "permission denied"):
--
--    BEGIN;
--      SET LOCAL ROLE anon;
--      SELECT * FROM get_feed(3);
--    ROLLBACK;
