import { supabase } from '../lib/supabase'

// Likes and saves. Each function throws on error so react-query mutations can roll
// back their optimistic update in onError.
async function run(query) {
  const { error } = await query
  if (error) throw error
}

export const addLike = (postId, userId) =>
  run(supabase.from('likes').insert({ post_id: postId, user_id: userId }))

export const removeLike = (postId, userId) =>
  run(supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId))

export const addSave = (postId, userId) =>
  run(supabase.from('saves').insert({ post_id: postId, user_id: userId }))

export const removeSave = (postId, userId) =>
  run(supabase.from('saves').delete().eq('post_id', postId).eq('user_id', userId))
