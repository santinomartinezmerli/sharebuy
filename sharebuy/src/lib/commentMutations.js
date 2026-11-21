import { createComment, updateComment, deleteComment } from '../services/comments'
import {
  commentsKey, appendComment, replaceComment, patchComment, removeComment, flattenComments,
} from './commentsCache'

// Options for the three comment mutations of one post, kept apart from React so they can be
// tested with a plain QueryClient. useComments passes each one to useMutation.
export function commentMutationOptions(queryClient, postId, userId) {
  const key = commentsKey(postId)

  return {
    // Publish: the comment shows up right away with a temporary id and is swapped for the saved
    // one (real id, server date and profile) when the request returns. On error it disappears.
    create: {
      mutationFn: ({ text }) => createComment(postId, userId, text),
      onMutate: async ({ text, tempId }) => {
        // A refetch landing now would overwrite the optimistic comment.
        await queryClient.cancelQueries({ queryKey: key })
        appendComment(queryClient, postId, {
          id: tempId,
          post_id: postId,
          user_id: userId,
          content: text,
          created_at: new Date().toISOString(),
          profiles: { username: 'tú', avatar_url: null },
        })
      },
      onSuccess: (saved, { tempId }) => replaceComment(queryClient, postId, tempId, saved),
      onError: (_err, { tempId }) => removeComment(queryClient, postId, tempId),
    },

    // Edit: the new text shows right away and goes back to the old one if the update does not
    // happen (error, or no row was updated).
    edit: {
      mutationFn: ({ id, content }) => updateComment(id, content),
      onMutate: async ({ id, content }) => {
        await queryClient.cancelQueries({ queryKey: key })
        const previous = flattenComments(queryClient.getQueryData(key)).find((c) => c.id === id)?.content
        patchComment(queryClient, postId, id, { content })
        return { previous }
      },
      onError: (_err, { id }, context) => {
        if (context?.previous !== undefined) {
          patchComment(queryClient, postId, id, { content: context.previous })
        }
      },
    },

    // Delete: not optimistic. The comment leaves the list only once the server confirmed it
    // deleted a row, so a refused delete does not make it vanish until the next reload.
    remove: {
      mutationFn: ({ id }) => deleteComment(id),
      onSuccess: (_data, { id }) => removeComment(queryClient, postId, id),
    },
  }
}
