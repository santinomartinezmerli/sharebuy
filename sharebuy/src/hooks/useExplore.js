import { useMemo, useCallback, useEffect } from 'react'
import { useInfiniteQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchExplorePage } from '../services/explore'
import { exploreKey } from '../lib/exploreCache'

// `filters` must keep the same identity between renders unless a value changes
// (memoize it in the caller): { search, category, brand, minPrice, maxPrice }.
export function useExplore(userId, filters) {
  const queryClient = useQueryClient()
  const key = useMemo(() => exploreKey(userId, filters), [userId, filters])

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchExplorePage(filters, pageParam)
      } catch (err) {
        console.error('Explore request failed:', err)
        throw err
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    // While a new filter loads, keep showing the previous results instead of the skeleton.
    placeholderData: keepPreviousData,
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

  // Pull-to-refresh: refreshes in place, no skeleton. It keeps only page 1 and fetches it
  // again (otherwise every page loaded so far would be refetched). Pull-to-refresh only
  // starts with the scroll at the very top, so cutting the list there is not noticeable.
  const refresh = useCallback(async () => {
    queryClient.setQueryData(key, (old) =>
      old && { pages: old.pages.slice(0, 1), pageParams: old.pageParams.slice(0, 1) }
    )
    await queryClient.refetchQueries({ queryKey: key, exact: true })
  }, [queryClient, key])

  useEffect(() => {
    window.__ptrRefresh = refresh
    const handler = () => refresh()
    window.addEventListener('ptr-refresh', handler)
    return () => {
      window.removeEventListener('ptr-refresh', handler)
      window.__ptrRefresh = null
    }
  }, [refresh])

  return {
    posts,
    loading: query.isPending,
    updating: query.isPlaceholderData,
    loadingMore: isFetchingNextPage,
    hasMore,
    loadMore,
    refresh,
  }
}
