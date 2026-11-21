-- Migration 004: get_explore() and get_explore_brands() for the Explore screen.
--
-- Replaces three unbounded client queries (all posts, all my likes, all my
-- blocked users) and the filters that ran in the browser with ONE paginated,
-- filtered request. The brand dropdown gets its own query because it can no
-- longer be derived from "all the posts that happen to be loaded".
--
-- Re-runnable: CREATE OR REPLACE / IF NOT EXISTS. CREATE OR REPLACE cannot
-- change a RETURNS TABLE shape; DROP the function first if you change it.
--
-- ROLLBACK (run manually):
--   DROP FUNCTION IF EXISTS public.get_explore(int, timestamptz, uuid, text,
--     text, text, numeric, numeric);
--   DROP FUNCTION IF EXISTS public.get_explore_brands(int);
--   DROP FUNCTION IF EXISTS public.parse_price(text);
--   DROP INDEX IF EXISTS public.idx_posts_created_at_id;


-- 1. Index for the keyset cursor (created_at DESC, id DESC). The existing
--    idx_posts_created_at only covers created_at, so ties on created_at would
--    need an extra sort.
CREATE INDEX IF NOT EXISTS idx_posts_created_at_id
  ON public.posts (created_at DESC, id DESC);


-- 2. parse_price(text): posts.price is free text ("$1.500", "12,50", ...), so
--    it is parsed here to be able to filter by a price range.
--    Argentine format: "$" and spaces are ignored, "." is a thousands
--    separator and "," is the decimal separator.
--        '1.500' -> 1500      '1.500,50' -> 1500.50   '12,50' -> 12.5
--        '12.50' -> 12.50     '$ 1500'   -> 1500      'abc'   -> NULL
--    Known ambiguity: '1.234' is read as 1234 (thousands), not 1.234, and
--    '1,500' is read as 1.5. Anything that is not a plain number returns NULL
--    and is excluded when a price filter is active (same as the old client
--    code, where parseFloat gave NaN).
CREATE OR REPLACE FUNCTION public.parse_price(p text)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN length(s.t) > 15 THEN NULL
    WHEN s.t ~ '^[0-9]{1,3}([.][0-9]{3})+(,[0-9]+)?$'
      THEN replace(replace(s.t, '.', ''), ',', '.')::numeric
    WHEN s.t ~ '^[0-9]+,[0-9]+$' THEN replace(s.t, ',', '.')::numeric
    WHEN s.t ~ '^[0-9]+([.][0-9]+)?$' THEN s.t::numeric
  END
  FROM (
    SELECT regexp_replace(coalesce(p, ''), '[$[:space:]]', '', 'g') AS t
  ) s
$$;


-- 3. get_explore: one page of the Explore grid.
--
--    Usage: select * from get_explore(24);                       -- page 1
--           select * from get_explore(24, '<created_at>', '<id>');  -- next
--           select * from get_explore(24, p_search => 'nike',
--                                     p_category => 'Ropa',
--                                     p_min_price => 1000);
--
--    - Posts of users I blocked are excluded (same rule as the old client).
--    - p_search: case-insensitive match on product OR brand. % and _ typed by
--      the user are escaped (ESCAPE '!'), so they match literally.
--    - p_category: exact match. NULL or '' means "Todo".
--    - p_brand: exact match ignoring case and surrounding spaces, because the
--      value comes from the dropdown (get_explore_brands).
--    - p_min_price / p_max_price: compared against parse_price(price).
--    - Keyset pagination on (created_at DESC, id DESC); send BOTH cursor
--      values from the last row of the previous page.
--    - Fetches limit + 1 internally and returns `limit`; has_more is the same
--      value on every returned row. p_limit is clamped to 1..50.
--    - SECURITY INVOKER: RLS applies to the caller.
--    - profiles is {id, username, avatar_url}; Explore needs profiles.id.
CREATE OR REPLACE FUNCTION public.get_explore(
  p_limit             int         DEFAULT 24,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id         uuid        DEFAULT NULL,
  p_search            text        DEFAULT NULL,
  p_category          text        DEFAULT NULL,
  p_brand             text        DEFAULT NULL,
  p_min_price         numeric     DEFAULT NULL,
  p_max_price         numeric     DEFAULT NULL
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
  liked_by_me   boolean,
  has_more      boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  cfg AS (
    SELECT least(greatest(coalesce(p_limit, 24), 1), 50) AS n,
           auth.uid()                                     AS uid,
           nullif(btrim(p_category), '')                  AS category,
           lower(nullif(btrim(p_brand), ''))              AS brand,
           CASE WHEN nullif(btrim(p_search), '') IS NULL THEN NULL
                ELSE '%' || replace(replace(replace(btrim(p_search),
                       '!', '!!'), '%', '!%'), '_', '!_') || '%'
           END                                            AS pattern
  ),
  -- One extra row (n + 1) only to detect whether another page exists.
  page AS (
    SELECT p.*
    FROM posts p
    CROSS JOIN cfg
    WHERE cfg.uid IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM blocked_users b
        WHERE b.blocker_id = cfg.uid
          AND b.blocked_id = p.user_id
      )
      AND (p_cursor_created_at IS NULL
           OR (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id))
      AND (cfg.category IS NULL OR p.category = cfg.category)
      AND (cfg.brand IS NULL OR lower(btrim(p.brand)) = cfg.brand)
      AND (cfg.pattern IS NULL
           OR p.product ILIKE cfg.pattern ESCAPE '!'
           OR p.brand ILIKE cfg.pattern ESCAPE '!')
      AND (p_min_price IS NULL OR parse_price(p.price) >= p_min_price)
      AND (p_max_price IS NULL OR parse_price(p.price) <= p_max_price)
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT (SELECT n + 1 FROM cfg)
  ),
  numbered AS (
    SELECT page.*,
           row_number() OVER (ORDER BY page.created_at DESC, page.id DESC)
                                                                    AS rn,
           count(*) OVER ()                                         AS total
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
         ELSE jsonb_build_object('id', pr.id,
                                 'username', pr.username,
                                 'avatar_url', pr.avatar_url)
    END,
    EXISTS (
      SELECT 1 FROM likes l
      WHERE l.post_id = p.id AND l.user_id = cfg.uid
    ),
    p.total > cfg.n
  FROM numbered p
  CROSS JOIN cfg
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE p.rn <= cfg.n
  ORDER BY p.rn
$$;


-- 4. get_explore_brands: options for the brand dropdown, most used first.
--    Brands that differ only in case or surrounding spaces are merged
--    ("Nike" and "nike "). Returns at most p_limit brands (default 100,
--    max 200), so the dropdown never loads every brand.
CREATE OR REPLACE FUNCTION public.get_explore_brands(p_limit int DEFAULT 100)
RETURNS TABLE (
  brand       text,
  post_count  bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT min(btrim(p.brand)) AS brand,
         count(*)            AS post_count
  FROM posts p
  WHERE nullif(btrim(p.brand), '') IS NOT NULL
  GROUP BY lower(btrim(p.brand))
  ORDER BY count(*) DESC, lower(btrim(p.brand))
  LIMIT least(greatest(coalesce(p_limit, 100), 1), 200)
$$;


-- 5. Permissions. Supabase grants EXECUTE on new functions to anon through
--    default privileges, so anon is revoked explicitly.
REVOKE EXECUTE ON FUNCTION public.parse_price(text)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_explore(int, timestamptz, uuid, text,
  text, text, numeric, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_explore_brands(int)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.parse_price(text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_explore(int, timestamptz, uuid, text,
  text, text, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_explore_brands(int)
  TO authenticated;


-- 6. How to test it as a real user.
--    Replace <USER_UUID> with an id from profiles and run everything between
--    BEGIN and ROLLBACK as ONE script (set_config with `true` only lasts for
--    the current transaction):
--
      BEGIN;
      SELECT set_config('request.jwt.claims',
        '{"sub":"722fe43a-9d8c-42a2-a0eb-d7f0ffe644b7","role":"authenticated"}', true);
      SET LOCAL ROLE authenticated;

      -- Price parsing. Expect: 1500, 1500.50, 12.5, 12.50, 1500, NULL
      SELECT parse_price('1.500'), parse_price('1.500,50'),
             parse_price('12,50'), parse_price('12.50'),
             parse_price('$ 1500'), parse_price('abc');

      -- Page 1, no filters (null cursor).
      SELECT id, product, brand, price, created_at::text AS created_at,
             liked_by_me, has_more
      FROM get_explore(5);

      -- Page 2: paste created_at and id of the LAST row of page 1.
      SELECT id, product, created_at::text AS created_at, has_more
      FROM get_explore(5, '<LAST_CREATED_AT>'::timestamptz,
                       '<LAST_ID>'::uuid);

      -- Filters: search, category and price range.
      SELECT id, product, brand, category, price
      FROM get_explore(10, p_search => 'a');
      SELECT id, product, category, price
      FROM get_explore(10, p_category => 'Ropa',
                       p_min_price => 1000, p_max_price => 5000);

      -- Brand dropdown.
      SELECT * FROM get_explore_brands(10);

      -- Plan and rows touched.
        EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM get_explore(24);
        ROLLBACK;
--
--    anon must be blocked (expect "permission denied"):
--
--    BEGIN;
--      SET LOCAL ROLE anon;
--      SELECT * FROM get_explore(5);
--    ROLLBACK;
--
--    Scale note: ILIKE '%text%' cannot use a btree index, so a search scans
--    posts newest-first until it finds enough matches. Fine for now; if posts
--    grows a lot, add pg_trgm GIN indexes on product and brand.
