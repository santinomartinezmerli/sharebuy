import { useMemo, useCallback } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchFollowListPage } from '../services/followLists'
import { followUser, unfollowUser } from '../services/profiles'
import { followListKey, patchFollowListUser } from '../lib/followListCache'
import { invalidateFollowChanges } from '../lib/queryInvalidation'

// Followers (type 'followers') or followed users (type 'following') of `profileId`, 30 per page,
// most recent follow first. Each user has `following`: does `viewerId` follow them.
// Cached for 60s, so coming back to a list you just saw is instant.
export function useFollowList(profileId, type, viewerId) {
  const query = useInfiniteQuery({
    queryKey: followListKey(profileId, type, viewerId),
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchFollowListPage({ profileId, type, viewerId }, pageParam)
      } catch (err) {
        console.error('Follow list request failed:', err)
        throw err
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!profileId && !!viewerId,
    staleTime: 60_000,
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query

  const users = useMemo(() => data?.pages.flatMap((page) => page.users) ?? [], [data])

  // After a failed "load more" stop paginating instead of retrying in a loop
  // (the scroll observer would fire again immediately).
  const hasMore = !!hasNextPage && !isFetchNextPageError

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingNextPage) return
    fetchNextPage()
  }, [hasMore, isFetchingNextPage, fetchNextPage])

  return { users, loading: query.isPending, loadingMore: isFetchingNextPage, hasMore, loadMore }
}

// The follow / unfollow button of a row. The button flips instantly in every cached list of this
// viewer and goes back if the request fails. When it settles, everything that depends on who the
// viewer follows is marked stale: the feed, the profile headers (counts) and the other lists.
export function useToggleFollowInList(viewerId) {
  const queryClient = useQueryClient()

  const setFollowing = (targetId, following) =>
    patchFollowListUser(queryClient, viewerId, targetId, () => ({ following }))

  const { mutate, isPending, variables } = useMutation({
    mutationFn: ({ targetId, wasFollowing }) =>
      wasFollowing ? unfollowUser(viewerId, targetId) : followUser(viewerId, targetId),
    onMutate: async ({ targetId, wasFollowing }) => {
      // A refetch landing now would overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: ['followList'] })
      setFollowing(targetId, !wasFollowing)
    },
    onError: (_err, { targetId, wasFollowing }) => setFollowing(targetId, wasFollowing),
    onSettled: () => invalidateFollowChanges(queryClient),
  })

  const toggle = useCallback((user) => {
    if (!viewerId) return
    if (isPending && variables?.targetId === user.id) return
    mutate({ targetId: user.id, wasFollowing: !!user.following })
  }, [viewerId, isPending, variables, mutate])

  return { toggle }
}
