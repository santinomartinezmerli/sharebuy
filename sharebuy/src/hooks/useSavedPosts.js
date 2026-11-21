import { useMemo, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchSavedPage } from '../services/saves'
import { savedPostsKey } from '../lib/profileCache'

// The "Guardados" tab: posts the user saved, 24 per page, most recently saved first.
// `enabled` lets the screen ask for them only when the tab is opened. Cached for 60s; saving or
// unsaving a post invalidates it (see invalidateSavedPosts), so it is never out of date.
export function useSavedPosts(userId, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: savedPostsKey(userId),
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchSavedPage(userId, pageParam)
      } catch (err) {
        console.error('Saved posts request failed:', err)
        throw err
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId && enabled,
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

  return { posts, loading: query.isPending, loadingMore: isFetchingNextPage, hasMore, loadMore }
}
