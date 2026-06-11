import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StoryViewer from '../components/StoryViewer'
import ImageCarousel from '../components/ImageCarousel'
import Avatar from '../components/Avatar'

function PostCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [liking, setLiking] = useState(false)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchLikes = async () => {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      const { data: userLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .single()

      const { data: savedData } = await supabase
        .from('saves')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .maybeSingle()

      setLikesCount(count ?? 0)
      setLiked(!!userLike)
      setSaved(!!savedData)
    }
    fetchLikes()
  }, [post.id, currentUserId])

  const handleLike = async () => {
    setLiking(true)
    if (liked) {
      await supabase.from('likes').delete()
        .eq('post_id', post.id).eq('user_id', currentUserId)
      setLiked(false)
      setLikesCount(prev => prev - 1)
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId })
      setLiked(true)
      setLikesCount(prev => prev + 1)
    }
    setLiking(false)
  }

  const handleSave = async (e) => {
    e.stopPropagation()
    setSaving(true)
    if (saved) {
      const { error } = await supabase.from('saves').delete().eq('post_id', post.id).eq('user_id', currentUserId)
      if (!error) setSaved(false)
    } else {
      const { error } = await supabase.from('saves').insert({ post_id: post.id, user_id: currentUserId })
      if (!error) setSaved(true)
    }
    setSaving(false)
  }

  const imageUrls = (post.image_urls && post.image_urls.length > 0)
    ? post.image_urls
    : (post.image_url ? [post.image_url] : [])

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate(`/user/${post.user_id}`)}>
          <Avatar url={post.profiles?.avatar_url} username={post.profiles?.username} size="md" />
        </button>
        <div className="flex-1">
          <button onClick={() => navigate(`/user/${post.user_id}`)} className="text-sm font-medium text-gray-900 dark:text-white">
            {post.profiles?.username ?? 'usuario'}
          </button>
          <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString('es-AR')}</p>
        </div>
      </div>

      {imageUrls.length > 0 ? (
        <button onClick={() => navigate(`/post/${post.id}`)} className="w-full block">
          <ImageCarousel images={imageUrls} brand={post.brand} />
        </button>
      ) : (
        <button onClick={() => navigate(`/post/${post.id}`)} className="w-full">
          <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
            <span className="text-7xl">{post.emoji ?? '🛍️'}</span>
            {post.brand && (
              <span className="absolute bottom-3 left-3 bg-white text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-100">
                {post.brand}
              </span>
            )}
          </div>
        </button>
      )}

      <div className="px-4 py-3 flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} disabled={liking} className="flex items-center gap-1 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {likesCount > 0 && <span className="text-xs text-gray-400">{likesCount}</span>}
          </button>
          <button onClick={() => navigate(`/post/${post.id}`)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button onClick={handleSave} disabled={saving} className="disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${saved ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-300">
          <button onClick={() => navigate(`/user/${post.user_id}`)} className="font-medium text-gray-900 dark:text-white">
            {post.profiles?.username ?? 'usuario'}
          </button>
          {' '}{post.product}
          {post.caption && ` · ${post.caption}`}
          {post.price && <span className="text-green-500 font-medium"> ${post.price}</span>}
        </p>
        {post.where_bought && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {post.where_bought}
          </p>
        )}
      </div>
    </div>
  )
}

function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-16" />
        </div>
      </div>
      <div className="aspect-square bg-gray-100 dark:bg-gray-700" />
      <div className="px-4 py-3 space-y-2">
        <div className="flex gap-4">
          <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>
    </div>
  )
}

function Feed() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [storyGroups, setStoryGroups] = useState([])
  const [activeStoryGroup, setActiveStoryGroup] = useState(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10
  const observerRef = useRef(null)
  const sentinelRef = useRef(null)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  useEffect(() => {
    const fetchPosts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const [followsData, blockedData] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id)
      ])

      const blockedIds = new Set(blockedData.data?.map(b => b.blocked_id) ?? [])
      const followingIds = (followsData.data?.map(f => f.following_id) ?? []).filter(id => !blockedIds.has(id))
      const ids = [user.id, ...followingIds]

      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1)

      if (!error) {
        setPosts(data ?? [])
        setHasMore((data?.length ?? 0) >= PAGE_SIZE)
        setPage(1)

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const recentPosts = (data ?? []).filter(p => new Date(p.created_at) > oneDayAgo)
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
        setStoryGroups(Object.values(groups))
      }
      setLoading(false)
    }
    fetchPosts()
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    const { data: { user } } = await supabase.auth.getUser()
    const [followsData, blockedData] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id)
    ])
    const blockedIds = new Set(blockedData.data?.map(b => b.blocked_id) ?? [])
    const followingIds = (followsData.data?.map(f => f.following_id) ?? []).filter(id => !blockedIds.has(id))
    const ids = [user.id, ...followingIds]

    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (data && data.length > 0) {
      setPosts(prev => [...prev, ...data])
      setPage(prev => prev + 1)
      setHasMore(data.length >= PAGE_SIZE)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }, [page, loadingMore, hasMore])

  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore()
      }
    }, { threshold: 0.1 })
    obs.observe(sentinelRef.current)
    observerRef.current = obs
    return () => obs.disconnect()
  }, [loadMore, hasMore, loadingMore])

  return (
    <div className="flex flex-col dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-xl font-semibold tracking-tight">
          share<span className="text-green-500">buy</span>
        </h1>
        <div className="flex items-center gap-4 text-gray-400">
          <button onClick={handleSignOut} className="text-xs text-red-400">Salir</button>
          <button onClick={() => navigate('/notifications')} className="text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button onClick={() => navigate('/messages')} className="text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
      </div>

      {storyGroups.length > 0 && (
        <div className="flex gap-3 px-4 py-3 overflow-x-auto border-b border-gray-100">
          {storyGroups.map((group, index) => (
            <button key={group.userId} onClick={() => setActiveStoryGroup(index)} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-14 h-14 rounded-full p-0.5 border-2 border-green-500">
                <div className="w-full h-full rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium overflow-hidden">
                  {group.avatarUrl
                    ? <img src={group.avatarUrl} className="w-full h-full object-cover" alt="" />
                    : (group.userId === currentUserId ? 'Tú' : group.username?.slice(0, 2).toUpperCase())
                  }
                </div>
              </div>
              <span className="text-[10px] text-gray-500 max-w-[56px] truncate">
                {group.userId === currentUserId ? 'Tu compra' : group.username}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <p className="text-sm">Todavía no hay compras</p>
          <p className="text-xs">¡Sé el primero en compartir algo!</p>
        </div>
      ) : (
        <div>
          {posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="py-4 text-center text-xs text-gray-400">Cargando más...</div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="py-6 text-center text-xs text-gray-300">Ya viste todas las compras</div>
          )}
        </div>
      )}

      {activeStoryGroup !== null && (
        <StoryViewer
          stories={storyGroups[activeStoryGroup].stories}
          startIndex={0}
          onClose={() => setActiveStoryGroup(null)}
        />
      )}
    </div>
  )
}

export default Feed
