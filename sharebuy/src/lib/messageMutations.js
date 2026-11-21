import { sendTextMessage, updateMessage, deleteMessage } from '../services/chat'
import {
  messagesKey, addTempMessage, confirmSentMessage, removeMessage, patchMessage, flattenMessages,
} from './messagesCache'

// Options for the three message mutations of one conversation, kept apart from React so they can
// be tested with a plain QueryClient. useChatMessages passes each one to useMutation.
export function messageMutationOptions(queryClient, conversationId, userId) {
  const key = messagesKey(conversationId)

  return {
    // Send a text message. It shows at once with a temporary id. Whichever comes first, the
    // response of the insert or the Realtime echo, the message ends up in the list exactly once
    // (see addIncomingMessage and confirmSentMessage). On error the temporary message disappears.
    send: {
      mutationFn: ({ text }) => sendTextMessage(conversationId, userId, text),
      onMutate: async ({ text, tempId }) => {
        // A refetch landing now would overwrite the temporary message.
        await queryClient.cancelQueries({ queryKey: key })
        addTempMessage(queryClient, conversationId, {
          id: tempId,
          conversation_id: conversationId,
          sender_id: userId,
          content: text,
          created_at: new Date().toISOString(),
          read_at: null,
          updated_at: null,
        })
      },
      onSuccess: (saved, { tempId }) => confirmSentMessage(queryClient, conversationId, tempId, saved),
      onError: (_err, { tempId }) => removeMessage(queryClient, conversationId, tempId),
    },

    // Edit: the new text shows right away and goes back if the update did not happen (error, or
    // no row was updated).
    edit: {
      mutationFn: ({ id, content, updatedAt }) => updateMessage(id, content, updatedAt),
      onMutate: async ({ id, content, updatedAt }) => {
        await queryClient.cancelQueries({ queryKey: key })
        const current = flattenMessages(queryClient.getQueryData(key)).find((m) => m.id === id)
        patchMessage(queryClient, conversationId, id, { content, updated_at: updatedAt })
        return { previous: current ? { content: current.content, updated_at: current.updated_at } : null }
      },
      onError: (_err, { id }, context) => {
        if (context?.previous) patchMessage(queryClient, conversationId, id, context.previous)
      },
    },

    // Delete: not optimistic. The message leaves the list only once the server confirmed it
    // deleted a row, so a refused delete does not make it vanish until the next reload.
    remove: {
      mutationFn: ({ id }) => deleteMessage(id),
      onSuccess: (_data, { id }) => removeMessage(queryClient, conversationId, id),
    },
  }
}
