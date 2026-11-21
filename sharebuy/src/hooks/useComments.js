import { useMemo, useCallback } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCommentsPage } from '../services/comments'
import { commentsKey, flattenComments } from '../lib/commentsCache'
import { commentMutationOptions } from '../lib/commentMutations'

// Comments of a post, shared by PostDetail and the feed's CommentSheet. 20 per page, oldest first
// ("Ver más" loads newer ones). `total` is the number shown in the header: it comes from the first
// page's count and is kept in step when you publish or delete.
//
// refetchOnMount: 'always' because someone else may have commented since you last looked; the
// cached comments show first and are refreshed behind.
export function useComments(postId, userId) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: commentsKey(postId),
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchCommentsPage(postId, pageParam)
      } catch (err) {
        console.error('Comments request failed:', err)
        throw err
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!postId,
    refetchOnMount: 'always',
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query

  const comments = useMemo(() => flattenComments(data), [data])
  const total = data?.pages[0]?.count ?? comments.length

  // After a failed "Ver más" stop offering it instead of retrying in a loop.
  const hasMore = !!hasNextPage && !isFetchNextPageError

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingNextPage) return
    fetchNextPage()
  }, [hasMore, isFetchingNextPage, fetchNextPage])

  const options = commentMutationOptions(queryClient, postId, userId)
  const create = useMutation(options.create)
  const edit = useMutation(options.edit)
  const remove = useMutation(options.remove)

  // Publish. Resolves true if it was saved and false if it failed (the temporary comment is
  // already gone), so the caller can put the text back in the input.
  const send = useCallback(async (text) => {
    const content = text.trim()
    if (!content || !userId) return false
    try {
      await create.mutateAsync({ text: content, tempId: `temp-${Date.now()}` })
      return true
    } catch {
      return false
    }
  }, [create, userId])

  // Edit / delete. Both resolve true on success and false on failure (already rolled back).
  const editComment = useCallback(async (id, content) => {
    const text = content.trim()
    if (!text) return false
    try { await edit.mutateAsync({ id, content: text }); return true } catch { return false }
  }, [edit])

  const deleteById = useCallback(async (id) => {
    try { await remove.mutateAsync({ id }); return true } catch { return false }
  }, [remove])

  return {
    comments,
    total,
    loading: query.isPending,
    loadingMore: isFetchingNextPage,
    hasMore,
    loadMore,
    send,
    sending: create.isPending,
    editComment,
    deleteById,
  }
}
