import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 10

async function fetchFeedIds(userId) {
  if (!userId) return { ids: [], blockedIds: new Set() }
  const [followsData, blockedData] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', userId),
    supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId)
  ])
  const blockedIds = new Set(blockedData.data?.map(b => b.blocked_id) ?? [])
  const followingIds = (followsData.data?.map(f => f.following_id) ?? []).filter(id => !blockedIds.has(id))
  const ids = [userId, ...followingIds]
  return { ids, blockedIds }
}

async function fetchPostsPage(ids, page) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username, avatar_url)')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return data ?? []
}

export function useFeed(userId) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const idsRef = useRef([])

  const loadPage = useCallback(async (pageIndex, append = false) => {
    const ids = idsRef.current
    if (!ids.length) return []
    const data = await fetchPostsPage(ids, pageIndex)
    if (append) {
      setPosts(prev => [...prev, ...data])
    } else {
      setPosts(data)
    }
    setHasMore(data.length >= PAGE_SIZE)
    return data
  }, [])

  const refreshFeed = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { ids } = await fetchFeedIds(userId)
    idsRef.current = ids
    await loadPage(0, false)
    setPage(1)
    setLoading(false)
  }, [userId, loadPage])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !userId) return
    setLoadingMore(true)
    const data = await loadPage(page, true)
    if (data.length > 0) {
      setPage(prev => prev + 1)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }, [loadingMore, hasMore, userId, page, loadPage])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!userId) return
      setLoading(true)
      const { ids } = await fetchFeedIds(userId)
      if (cancelled) return
      idsRef.current = ids
      const data = await fetchPostsPage(ids, 0)
      if (cancelled) return
      setPosts(data)
      setHasMore(data.length >= PAGE_SIZE)
      setPage(1)
      setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    window.__ptrRefresh = refreshFeed
    const handler = () => refreshFeed()
    window.addEventListener('ptr-refresh', handler)
    return () => {
      window.removeEventListener('ptr-refresh', handler)
      window.__ptrRefresh = null
    }
  }, [refreshFeed])

  return { posts, loading, loadingMore, hasMore, loadMore, refreshFeed }
}
