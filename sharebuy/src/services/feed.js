import { supabase } from '../lib/supabase'

export const FEED_PAGE_SIZE = 10

// One request per page: the get_feed RPC (supabase/migrations/002_get_feed.sql) applies
// follows/blocked filtering and returns the author profile, like_count, liked_by_me and
// saved_by_me. has_more comes back on every row; the server fetches limit + 1 internally,
// so a page that ends exactly on the last post is detected without an empty extra request.
//
// `cursor` is the last post of the previous page ({ created_at, id }) or null for page 1.
// created_at is passed back as the original ISO string, never a Date, so no microseconds
// are lost.
//
// Returns { posts, nextCursor }; nextCursor is undefined when there is no next page,
// which is what useInfiniteQuery's getNextPageParam expects.
export async function fetchFeedPage(cursor) {
  const { data, error } = await supabase.rpc('get_feed', {
    p_limit: FEED_PAGE_SIZE,
    p_cursor_created_at: cursor?.created_at ?? null,
    p_cursor_id: cursor?.id ?? null,
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
