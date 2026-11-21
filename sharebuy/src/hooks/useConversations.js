import { useMemo, useCallback, useEffect } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { fetchConversationsPage } from '../services/conversations'
import { conversationsKey } from '../lib/conversationsCache'

// The Messages list: 20 conversations per page, most recently active first. Each one has
// other_user, last_message, last_message_at and unread_count.
export function useConversations(userId) {
  const queryClient = useQueryClient()
  const key = useMemo(() => conversationsKey(userId), [userId])

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchConversationsPage(pageParam)
      } catch (err) {
        console.error('Conversations request failed:', err)
        throw err
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
    // The unread counts depend on localStorage, which Chat updates without telling react-query, so
    // this list is never trusted as fresh: it refetches every time the screen opens and every
    // time the tab becomes visible again (as before), showing the cached list first.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query

  const conversations = useMemo(() => data?.pages.flatMap((page) => page.conversations) ?? [], [data])

  // After a failed "load more" stop paginating instead of retrying in a loop
  // (the scroll observer would fire again immediately).
  const hasMore = !!hasNextPage && !isFetchNextPageError

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingNextPage) return
    fetchNextPage()
  }, [hasMore, isFetchingNextPage, fetchNextPage])

  // Pull-to-refresh: refreshes in place, no skeleton. It keeps only page 1 and fetches it again
  // (otherwise every page loaded so far would be refetched). Pull-to-refresh only starts with the
  // scroll at the very top, so cutting the list there is not noticeable.
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

  return { conversations, loading: query.isPending, loadingMore: isFetchingNextPage, hasMore, loadMore, refresh }
}
