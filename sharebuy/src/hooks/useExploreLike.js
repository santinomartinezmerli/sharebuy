import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addLike, removeLike } from '../services/engagement'
import { patchExplorePost } from '../lib/exploreCache'
import { invalidateFeed } from '../lib/feedCache'

// Like from the Explore grid. The heart flips immediately in every cached Explore list
// and goes back if the request fails. The like also shows in the feed (liked_by_me,
// like_count), so the feed is marked stale and refreshes the next time it is shown.
export function useExploreLike(userId) {
  const queryClient = useQueryClient()

  const setLiked = (postId, liked) =>
    patchExplorePost(queryClient, postId, () => ({ liked_by_me: liked }))

  const { mutate, isPending, variables } = useMutation({
    mutationFn: ({ postId, wasLiked }) =>
      wasLiked ? removeLike(postId, userId) : addLike(postId, userId),
    onMutate: async ({ postId, wasLiked }) => {
      // A refetch landing now would overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: ['explore'] })
      setLiked(postId, !wasLiked)
    },
    onError: (_err, { postId, wasLiked }) => setLiked(postId, wasLiked),
    onSettled: () => invalidateFeed(queryClient),
  })

  const toggleLike = useCallback((post) => {
    if (!userId) return
    if (isPending && variables?.postId === post.id) return
    mutate({ postId: post.id, wasLiked: !!post.liked_by_me })
  }, [userId, isPending, variables, mutate])

  return { toggleLike }
}
