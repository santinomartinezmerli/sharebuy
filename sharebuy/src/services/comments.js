import { supabase } from '../lib/supabase'

export const COMMENTS_PAGE_SIZE = 20

const COLUMNS = 'id, post_id, user_id, content, created_at, profiles(username, avatar_url)'

// One page of a post's comments, OLDEST first (the order the screens always had), so "Ver más"
// loads newer ones. `cursor` is { created_at, id } of the last comment of the previous page, or
// null. created_at is passed back as the original ISO string, never a Date, so no microseconds
// are lost.
//
// The first page also returns the total number of comments (`count`) in the same request
// (count: 'exact'). Later pages do not ask for it: with a cursor the count would only cover the
// comments after it.
//
// Fetches PAGE_SIZE + 1 rows to know if there is a next page and returns PAGE_SIZE.
// nextCursor is undefined on the last page, as useInfiniteQuery expects.
export async function fetchCommentsPage(postId, cursor) {
  const first = !cursor

  let query = supabase
    .from('comments')
    .select(COLUMNS, first ? { count: 'exact' } : {})
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(COMMENTS_PAGE_SIZE + 1)

  if (cursor) {
    // (created_at, id) > cursor
    query = query.or(
      `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`
    )
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = data ?? []
  const hasMore = rows.length > COMMENTS_PAGE_SIZE
  const comments = hasMore ? rows.slice(0, COMMENTS_PAGE_SIZE) : rows
  const last = comments[comments.length - 1]

  return {
    comments,
    count: first ? (count ?? comments.length) : undefined,
    nextCursor: hasMore && last ? { created_at: last.created_at, id: last.id } : undefined,
  }
}

// Returns the new comment with the author's profile, as the list shows it.
export async function createComment(postId, userId, content) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, content })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data
}

// With row level security, an UPDATE or DELETE the user is not allowed to do matches no row and
// returns NO error, so the UI would show a change that was never saved. Asking for the affected
// ids back (.select('id')) lets us see that nothing happened and throw.
export async function updateComment(commentId, content) {
  const { data, error } = await supabase
    .from('comments')
    .update({ content })
    .eq('id', commentId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Comment was not updated (no matching row or no permission)')
}

export async function deleteComment(commentId) {
  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Comment was not deleted (no matching row or no permission)')
}
