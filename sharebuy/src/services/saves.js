import { supabase } from '../lib/supabase'

export const SAVED_PAGE_SIZE = 24

// One page of the posts a user saved, newest SAVED first, for the "Guardados" tab.
//
// The order and the cursor use the saves row (saves.created_at, saves.id), that is, WHEN the
// user saved the post, not when the post was created. The post comes embedded through the
// saves.post_id foreign key, so there is no need to load every saved id and then fetch the posts
// with .in(). Only the columns the grid needs are requested.
//
// `cursor` is { created_at, id } of the last SAVE of the previous page, or null.
// created_at is passed back as the original ISO string, never a Date, so no microseconds are lost.
//
// Fetches PAGE_SIZE + 1 rows to know if there is a next page and returns PAGE_SIZE.
// nextCursor is undefined on the last page, as useInfiniteQuery expects.
export async function fetchSavedPage(userId, cursor) {
  let query = supabase
    .from('saves')
    .select('id, created_at, post:posts(id, image_url, image_urls)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(SAVED_PAGE_SIZE + 1)

  if (cursor) {
    // (created_at, id) < cursor, both columns of saves (not of the embedded post).
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  const hasMore = rows.length > SAVED_PAGE_SIZE
  const page = hasMore ? rows.slice(0, SAVED_PAGE_SIZE) : rows
  const last = page[page.length - 1]

  return {
    // A save whose post is gone would have post: null; skip it (it cannot be shown).
    posts: page.filter((row) => row.post).map((row) => row.post),
    // The cursor comes from the last save of the page, even if its post was skipped.
    nextCursor: hasMore && last ? { created_at: last.created_at, id: last.id } : undefined,
  }
}
