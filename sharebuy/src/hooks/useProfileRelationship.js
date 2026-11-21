import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { followUser, unfollowUser, blockUser, unblockUser } from '../services/profiles'
import { profileKey, invalidateProfiles } from '../lib/profileCache'
import { invalidateFeed } from '../lib/feedCache'
import { invalidateExplore } from '../lib/exploreCache'
import { invalidateFollowChanges } from '../lib/queryInvalidation'

// Follow and block buttons of someone else's profile. Both flip instantly in the cached
// header (the profile you are looking at) and go back if the request fails.
export function useProfileRelationship(profileId, viewerId) {
  const queryClient = useQueryClient()
  const key = profileKey(profileId, viewerId)

  const patch = (fn) => queryClient.setQueryData(key, (old) => old && { ...old, ...fn(old) })

  const follow = useMutation({
    mutationFn: ({ wasFollowing }) =>
      wasFollowing ? unfollowUser(viewerId, profileId) : followUser(viewerId, profileId),
    onMutate: async ({ wasFollowing }) => {
      // A refetch landing now would overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: key })
      patch((o) => ({
        following: !wasFollowing,
        followersCount: o.followersCount + (wasFollowing ? -1 : 1),
      }))
    },
    onError: (_err, { wasFollowing }) =>
      patch((o) => ({
        following: wasFollowing,
        followersCount: o.followersCount + (wasFollowing ? 1 : -1),
      })),
    // Following changes whose posts the feed shows, the counts of other cached profiles and
    // the follower and following lists.
    onSettled: () => invalidateFollowChanges(queryClient),
  })

  const block = useMutation({
    mutationFn: ({ wasBlocked }) =>
      wasBlocked ? unblockUser(viewerId, profileId) : blockUser(viewerId, profileId),
    onMutate: async ({ wasBlocked }) => {
      await queryClient.cancelQueries({ queryKey: key })
      patch(() => ({ blocked: !wasBlocked }))
    },
    onError: (_err, { wasBlocked }) => patch(() => ({ blocked: wasBlocked })),
    // Blocking hides that user's posts in the feed and in Explore.
    onSettled: () => {
      invalidateFeed(queryClient)
      invalidateExplore(queryClient)
      invalidateProfiles(queryClient)
    },
  })

  const toggleFollow = useCallback(() => {
    if (!viewerId || follow.isPending) return
    follow.mutate({ wasFollowing: !!queryClient.getQueryData(key)?.following })
  }, [viewerId, follow, queryClient, key])

  const toggleBlock = useCallback(() => {
    if (!viewerId || block.isPending) return
    block.mutate({ wasBlocked: !!queryClient.getQueryData(key)?.blocked })
  }, [viewerId, block, queryClient, key])

  return { toggleFollow, toggleBlock }
}
