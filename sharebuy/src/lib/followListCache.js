// A user's followers or following list, seen by one viewer. The viewer is part of the key
// because every row carries `following` (does THIS viewer follow that user).
export const followListKey = (profileId, type, viewerId) => ['followList', profileId, type, viewerId]

// Set fields on one user in EVERY cached follow list of this viewer. `following` is a fact about
// the viewer and that user, so it must be the same wherever the user appears (a user can be in
// both the followers and the following list of different profiles).
export function patchFollowListUser(queryClient, viewerId, targetId, patch) {
  queryClient.setQueriesData(
    { queryKey: ['followList'], predicate: (query) => query.queryKey[3] === viewerId },
    (old) => {
      if (!old?.pages) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          users: page.users.map((u) => (u.id === targetId ? { ...u, ...patch(u) } : u)),
        })),
      }
    }
  )
}

// Mark every cached follow list as stale (someone followed or unfollowed, or changed their name
// or avatar). A list that is on screen is not refetched while you are looking at it
// (refetchType: 'none'), so an optimistic toggle is not overwritten; the others refetch the next
// time they are shown, still showing the cached rows first.
export const invalidateFollowLists = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['followList'], refetchType: 'none' })
