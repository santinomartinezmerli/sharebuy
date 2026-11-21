import { useMemo, useCallback } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMessagesPage, fetchConversation } from '../services/chat'
import { messagesKey, flattenMessages, addIncomingMessage } from '../lib/messagesCache'
import { messageMutationOptions } from '../lib/messageMutations'

// The messages of a conversation, NEWEST first (the order of the chat's column-reverse list).
// The first page is the latest 30; loadMore goes further back in time. Realtime keeps the list
// live through addIncoming. refetchOnMount: 'always' because messages may have arrived while the
// chat was closed; the cached messages show first and are refreshed behind.
export function useChatMessages(conversationId, userId) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: messagesKey(conversationId),
    queryFn: async ({ pageParam }) => {
      try {
        return await fetchMessagesPage(conversationId, pageParam)
      } catch (err) {
        console.error('Messages request failed:', err)
        throw err
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId && !!userId,
    refetchOnMount: 'always',
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query

  const messages = useMemo(() => flattenMessages(data), [data])

  // After a failed "load older" stop trying instead of retrying in a loop (the scroll observer
  // would fire again immediately).
  const hasMore = !!hasNextPage && !isFetchNextPageError

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingNextPage) return
    fetchNextPage()
  }, [hasMore, isFetchingNextPage, fetchNextPage])

  const options = messageMutationOptions(queryClient, conversationId, userId)
  const sendM = useMutation(options.send)
  const editM = useMutation(options.edit)
  const removeM = useMutation(options.remove)

  // Send a text message. Resolves true if it was saved and false if it failed (the temporary
  // message is already gone), so the caller can put the text back in the input.
  const send = useCallback(async (text) => {
    const content = text.trim()
    if (!content || !userId) return false
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      await sendM.mutateAsync({ text: content, tempId })
      return true
    } catch {
      return false
    }
  }, [sendM, userId])

  // Edit / delete. Both resolve true on success and false on failure (already rolled back).
  const editMessage = useCallback(async (id, text) => {
    const content = text.trim()
    if (!content) return false
    try {
      await editM.mutateAsync({ id, content, updatedAt: new Date().toISOString() })
      return true
    } catch {
      return false
    }
  }, [editM])

  const deleteById = useCallback(async (id) => {
    try { await removeM.mutateAsync({ id }); return true } catch { return false }
  }, [removeM])

  // For the Realtime INSERT handler: adds the message once, never twice (see addIncomingMessage).
  const addIncoming = useCallback(
    (message) => addIncomingMessage(queryClient, conversationId, message, userId),
    [queryClient, conversationId, userId]
  )

  return {
    messages,
    loading: query.isPending,
    loadingMore: isFetchingNextPage,
    hasMore,
    loadMore,
    send,
    editMessage,
    deleteById,
    addIncoming,
  }
}

// The other user of the conversation, for the chat header. Cached for 5 minutes: it hardly changes.
export function useChatPartner(conversationId, userId) {
  const query = useQuery({
    queryKey: ['conversation', conversationId, userId],
    queryFn: () => fetchConversation(conversationId),
    enabled: !!conversationId && !!userId,
    staleTime: 5 * 60_000,
  })
  const conversation = query.data
  const otherUser = conversation
    ? (conversation.user1_id === userId ? conversation.user2 : conversation.user1)
    : null
  return { otherUser, loading: query.isPending }
}
