// Profile header (profile row, follower/following counts and, when viewing someone else,
// whether I follow / blocked them). One entry per (profile, viewer).
export const profileKey = (profileId, viewerId) => ['profile', profileId, viewerId]

// A profile's posts grid, one entry per profile.
export const profilePostsKey = (profileId) => ['profilePosts', profileId]

// Mark every cached profile header as stale (counts, name, avatar, follow state). Cached
// profiles that are on screen are not refetched while you are looking at them
// (refetchType: 'none'); the others refetch the next time they are shown.
export const invalidateProfiles = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['profile'], refetchType: 'none' })

// Mark every cached posts grid as stale (a post was published, edited or deleted).
export const invalidateProfilePosts = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['profilePosts'] })

// The posts a user saved ("Guardados" tab), one entry per user.
export const savedPostsKey = (userId) => ['savedPosts', userId]

// Mark every cached saved list as stale: a post was saved or unsaved, or deleted (deleting a
// post also removes it from everybody's saved list).
export const invalidateSavedPosts = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['savedPosts'] })
