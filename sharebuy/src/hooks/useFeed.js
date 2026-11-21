import { useMemo, useCallback, useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFeedPage } from '../services/feed'
import { feedKey } from '../lib/feedCache'

export function useFeed(userId) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: feedKey(userId),
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchFeedPage(pageParam)
      } catch (err) {
        console.error('Feed request failed:', err)
        throw err
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    // Within 60s coming back to the feed costs no request. Anything that changes the feed
    // calls invalidateFeed() (see lib/feedCache.js), which forces a refetch on the next
    // visit; older data is shown instantly and refreshed in the background.
    staleTime: 60_000,
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query

  const posts = useMemo(() => data?.pages.flatMap((page) => page.posts) ?? [], [data])

  // After a failed "load more" stop paginating instead of retrying in a loop
  // (the scroll observer would fire again immediately).
  const hasMore = !!hasNextPage && !isFetchNextPageError

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingNextPage) return
    fetchNextPage()
  }, [hasMore, isFetchingNextPage, fetchNextPage])

  // Pull-to-refresh: reset to the initial state and fetch only page 1. While it runs the
  // query is pending again, so the skeleton shows exactly like before.
  const refreshFeed = useCallback(
    () => queryClient.resetQueries({ queryKey: feedKey(userId) }),
    [queryClient, userId]
  )

  useEffect(() => {
    window.__ptrRefresh = refreshFeed
    const handler = () => refreshFeed()
    window.addEventListener('ptr-refresh', handler)
    return () => {
      window.removeEventListener('ptr-refresh', handler)
      window.__ptrRefresh = null
    }
  }, [refreshFeed])

  return { posts, loading: query.isPending, loadingMore: isFetchingNextPage, hasMore, loadMore, refreshFeed }
}
