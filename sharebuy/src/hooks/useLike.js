import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addLike, removeLike } from '../services/engagement'
import { feedKey, patchFeedPost } from '../lib/feedCache'

// Reads liked/likesCount straight from the post (which lives in the react-query cache) and
// updates the cache optimistically, so the heart is right even after leaving and coming
// back to the feed. On error the previous state is restored.
export function useLike(post, userId) {
  const queryClient = useQueryClient()

  // Moves the post to `liked`: +1 when it becomes liked, -1 when it stops being liked.
  // Applying it with the new state does the optimistic update; applying it with the old
  // state undoes it.
  const setLikedState = (liked) =>
    patchFeedPost(queryClient, userId, post.id, (p) => ({
      liked_by_me: liked,
      like_count: (p.like_count ?? 0) + (liked ? 1 : -1),
    }))

  const { mutate, isPending } = useMutation({
    mutationFn: ({ wasLiked }) => (wasLiked ? removeLike(post.id, userId) : addLike(post.id, userId)),
    onMutate: async ({ wasLiked }) => {
      // A background refetch landing now would overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: feedKey(userId) })
      setLikedState(!wasLiked)
    },
    onError: (_err, { wasLiked }) => setLikedState(wasLiked),
  })

  const toggleLike = useCallback(() => {
    if (!userId || isPending) return
    mutate({ wasLiked: !!post.liked_by_me })
  }, [userId, isPending, mutate, post.liked_by_me])

  return { liked: !!post.liked_by_me, likesCount: post.like_count ?? 0, toggleLike, loading: isPending }
}
