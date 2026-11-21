import { supabase } from '../lib/supabase'

export const EXPLORE_PAGE_SIZE = 24

// Empty inputs and NaN become null so the RPC treats them as "no filter".
const toNumber = (value) => {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// One page of the Explore grid via the get_explore RPC
// (supabase/migrations/004_explore.sql). Filtering, blocked users, paging and
// liked_by_me all happen in SQL.
//
// filters: { search, category, brand, minPrice, maxPrice }; the raw values the
//   UI holds ('' and 'Todo' mean "no filter").
// cursor: { created_at, id } of the last post of the previous page, or null.
//   created_at is passed back as the original ISO string, never a Date, so no
//   microseconds are lost.
//
// Returns { posts, nextCursor }; nextCursor is undefined when there is no next
// page, which is what useInfiniteQuery's getNextPageParam expects.
export async function fetchExplorePage(filters, cursor) {
  const category = filters.category && filters.category !== 'Todo' ? filters.category : null

  const { data, error } = await supabase.rpc('get_explore', {
    p_limit: EXPLORE_PAGE_SIZE,
    p_cursor_created_at: cursor?.created_at ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_search: filters.search?.trim() || null,
    p_category: category,
    p_brand: filters.brand || null,
    p_min_price: toNumber(filters.minPrice),
    p_max_price: toNumber(filters.maxPrice),
  })
  if (error) throw error

  const posts = data ?? []
  const last = posts[posts.length - 1]
  const hasMore = posts[0]?.has_more ?? false
  return {
    posts,
    nextCursor: hasMore && last ? { created_at: last.created_at, id: last.id } : undefined,
  }
}

// Options for the brand dropdown: the most used brands first, at most 100.
// Returns [{ brand, post_count }].
export async function fetchBrands() {
  const { data, error } = await supabase.rpc('get_explore_brands', { p_limit: 100 })
  if (error) throw error
  return data ?? []
}

// User results shown above the grid while searching.
export async function searchUsers(term) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${term}%`)
    .limit(10)
  return data ?? []
}
