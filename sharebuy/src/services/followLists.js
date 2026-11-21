import { supabase } from '../lib/supabase'

export const FOLLOW_LIST_PAGE_SIZE = 30

// One page of a user's followers or of the users they follow, most recent follow first.
//
//   type 'followers' -> the people who follow `profileId`
//   type 'following' -> the people `profileId` follows
//
// The order and the cursor use the follows row (follows.created_at, then follows.id), that is,
// when the follow happened. `cursor` is { created_at, id } of the last follow of the previous
// page, or null. created_at is passed back as the original ISO string, never a Date, so no
// microseconds are lost.
//
// Each returned user also carries `following`: whether `viewerId` already follows them. It is
// looked up only for the ids of THIS page (one extra query with .in() over at most 30 ids), never
// for the whole list, so it travels inside the cached page and a follow toggle can patch it.
//
// Fetches PAGE_SIZE + 1 rows to know if there is a next page and returns PAGE_SIZE.
// nextCursor is undefined on the last page, as useInfiniteQuery expects.
export async function fetchFollowListPage({ profileId, type, viewerId }, cursor) {
  const followers = type === 'followers'
  const shownColumn = followers ? 'follower_id' : 'following_id'   // the user shown in each row
  const ownerColumn = followers ? 'following_id' : 'follower_id'   // the profile the list belongs to

  let query = supabase
    .from('follows')
    .select(`id, created_at, profile:${shownColumn}(id, username, avatar_url, bio)`)
    .eq(ownerColumn, profileId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(FOLLOW_LIST_PAGE_SIZE + 1)

  if (cursor) {
    // (created_at, id) < cursor, both columns of follows (not of the embedded profile).
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  const hasMore = rows.length > FOLLOW_LIST_PAGE_SIZE
  const page = hasMore ? rows.slice(0, FOLLOW_LIST_PAGE_SIZE) : rows
  const last = page[page.length - 1]
  const users = page.map((row) => row.profile).filter(Boolean)

  // Which of the users on this page does the viewer already follow?
  const ids = users.map((u) => u.id).filter((id) => id !== viewerId)
  let followed = new Set()
  if (viewerId && ids.length > 0) {
    const { data: mine, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', ids)
    if (followError) throw followError
    followed = new Set((mine ?? []).map((f) => f.following_id))
  }

  return {
    users: users.map((u) => ({ ...u, following: followed.has(u.id) })),
    // The cursor comes from the last follow of the page, even if its profile was skipped.
    nextCursor: hasMore && last ? { created_at: last.created_at, id: last.id } : undefined,
  }
}
