import { useMemo, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchProfilePosts } from '../services/profiles'
import { profilePostsKey } from '../lib/profileCache'

// A user's posts grid, 24 per page. `total` is the post count shown in the header: it
// comes from the first page's count, in the same request, so no extra query is needed.
// Cached for 60s: coming back to a profile is instant.
export function useProfilePosts(profileId) {
  const query = useInfiniteQuery({
    queryKey: profilePostsKey(profileId),
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchProfilePosts(profileId, pageParam)
      } catch (err) {
        console.error('Profile posts request failed:', err)
        throw err
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!profileId,
    staleTime: 60_000,
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query

  const posts = useMemo(() => data?.pages.flatMap((page) => page.posts) ?? [], [data])
  const total = data?.pages[0]?.count ?? posts.length

  // After a failed "load more" stop paginating instead of retrying in a loop
  // (the scroll observer would fire again immediately).
  const hasMore = !!hasNextPage && !isFetchNextPageError

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingNextPage) return
    fetchNextPage()
  }, [hasMore, isFetchingNextPage, fetchNextPage])

  return { posts, total, loading: query.isPending, loadingMore: isFetchingNextPage, hasMore, loadMore }
}
