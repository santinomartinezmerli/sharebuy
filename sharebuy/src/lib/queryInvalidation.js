import { invalidateFeed } from './feedCache'
import { invalidateExplore } from './exploreCache'
import { invalidateProfilePosts, invalidateProfiles, invalidateSavedPosts } from './profileCache'
import { invalidateFollowLists } from './followListCache'

// Each helper is named after what happened and marks stale every cached list that shows it.
// Lists on screen refetch; the others refetch the next time they are shown, still showing the
// cached data first. Call them right after the write succeeds.

// A post was published, edited or deleted: feed, Explore, the profile grids (and the post
// count in the profile header, which comes from the first page of the grid) and the saved lists
// (a deleted post disappears from everybody's saved posts).
export const invalidatePostChanges = (queryClient) => {
  invalidateFeed(queryClient)
  invalidateExplore(queryClient)
  invalidateProfilePosts(queryClient)
  invalidateSavedPosts(queryClient)
}

// Someone's name, avatar or bio changed: feed and Explore show it on every post, and the
// profile headers and the follower lists show it too.
export const invalidateProfileChanges = (queryClient) => {
  invalidateFeed(queryClient)
  invalidateExplore(queryClient)
  invalidateProfiles(queryClient)
  invalidateFollowLists(queryClient)
}

// Someone followed or unfollowed: the feed shows other posts, the profile headers show
// different follower and following counts and the follower and following lists have one more
// or one fewer row.
export const invalidateFollowChanges = (queryClient) => {
  invalidateFeed(queryClient)
  invalidateProfiles(queryClient)
  invalidateFollowLists(queryClient)
}
