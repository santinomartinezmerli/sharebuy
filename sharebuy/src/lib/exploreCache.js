// One cached list per user and per set of filters, so going back to a search you
// already made is instant. All of them share the ['explore'] prefix.
export const exploreKey = (userId, filters) => ['explore', userId, filters]

// Apply `patch(post)` (returns the fields to change) to one post in EVERY cached
// Explore list, whatever filters it was fetched with. Used by the optimistic like
// so the heart is right in all of them.
export function patchExplorePost(queryClient, postId, patch) {
  queryClient.setQueriesData({ queryKey: ['explore'] }, (old) => {
    if (!old?.pages) return old
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        posts: page.posts.map((p) => (p.id === postId ? { ...p, ...patch(p) } : p)),
      })),
    }
  })
}

// Mark every cached Explore list as stale: a post was published, edited or deleted, the
// author changed their name or avatar, or someone was blocked. Lists on screen refetch now;
// the others refetch the next time they are shown, still showing the cached posts first.
export const invalidateExplore = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['explore'] })
