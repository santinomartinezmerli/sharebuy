import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSave(postId, userId) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetchSaved = async () => {
      const { data } = await supabase
        .from('saves')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()
      setSaved(!!data)
    }
    fetchSaved()
  }, [postId, userId])

  const toggleSave = useCallback(async (e) => {
    if (e) e.stopPropagation()
    if (!userId || loading) return
    setLoading(true)
    const wasSaved = saved
    setSaved(!wasSaved)

    if (wasSaved) {
      const { error } = await supabase.from('saves').delete().eq('post_id', postId).eq('user_id', userId)
      if (error) setSaved(true)
    } else {
      const { error } = await supabase.from('saves').insert({ post_id: postId, user_id: userId })
      if (error) setSaved(false)
    }
    setLoading(false)
  }, [saved, loading, postId, userId])

  return { saved, toggleSave, loading }
}
