import { useMemo } from 'react'

export function useStories(posts) {
  return useMemo(() => {
    if (!posts?.length) return []
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentPosts = posts.filter(p => new Date(p.created_at) > oneDayAgo)
    const groups = {}
    recentPosts.forEach(post => {
      if (!groups[post.user_id]) {
        groups[post.user_id] = {
          userId: post.user_id,
          username: post.profiles?.username,
          avatarUrl: post.profiles?.avatar_url,
          stories: []
        }
      }
      groups[post.user_id].stories.push(post)
    })
    return Object.values(groups)
  }, [posts])
}
