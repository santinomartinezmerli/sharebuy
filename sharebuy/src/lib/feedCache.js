// The feed lives in the react-query cache under one key per user, so switching accounts
// never shows the previous account's feed.
export const feedKey = (userId) => ['feed', userId]

// Mark every cached feed as stale. Call it after anything that can change what the feed
// shows: publishing, editing or deleting a post, following or unfollowing, blocking, a
// like or save made outside the feed, or a profile change. If the feed is on screen it
// refetches now; if not, it refetches the next time it mounts, still showing the cached
// posts first.
export const invalidateFeed = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['feed'] })

// Apply `patch(post)` (returns the fields to change) to one post inside every cached
// page of the feed. Used by optimistic likes/saves so the cache, and therefore any
// PostCard that mounts later, always agrees with what the user last saw.
export function patchFeedPost(queryClient, userId, postId, patch) {
  queryClient.setQueryData(feedKey(userId), (old) => {
    if (!old) return old
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        posts: page.posts.map((p) => (p.id === postId ? { ...p, ...patch(p) } : p)),
      })),
    }
  })
}
