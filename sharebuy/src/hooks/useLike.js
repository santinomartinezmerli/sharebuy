import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useLike(postId, userId) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetchLikes = async () => {
      const [{ count }, { data: userLike }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
        supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', userId).single()
      ])
      setLikesCount(count ?? 0)
      setLiked(!!userLike)
    }
    fetchLikes()
  }, [postId, userId])

  const toggleLike = useCallback(async () => {
    if (!userId || loading) return
    setLoading(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikesCount(prev => prev + (wasLiked ? -1 : 1))

    if (wasLiked) {
      const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
      if (error) {
        setLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } else {
      const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: userId })
      if (error) {
        setLiked(false)
        setLikesCount(prev => prev - 1)
      }
    }
    setLoading(false)
  }, [liked, loading, postId, userId])

  return { liked, likesCount, toggleLike, loading }
}
