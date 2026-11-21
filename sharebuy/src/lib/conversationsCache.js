// One cached conversation list per user.
export const conversationsKey = (userId) => ['conversations', userId]

// Mark every cached conversation list as stale: a message arrived or was sent, so the order, the
// last message and the unread counts changed. If the list is on screen it refetches now; if not,
// it refetches the next time it is shown (it also refetches on every open anyway).
export const invalidateConversations = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['conversations'] })
