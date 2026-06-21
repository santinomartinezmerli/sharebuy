import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/UserContext'
import { useFeed } from '../hooks/useFeed'
import { useStories } from '../hooks/useStories'
import StoryViewer from '../components/StoryViewer'
import PostCard from '../components/PostCard'
import CommentSheet from '../components/CommentSheet'

function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mx-4 mb-5 overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
      </div>
      <div className="px-2">
        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl" />
      </div>
      <div className="flex items-center px-4 pt-3 pb-1">
        <div className="flex gap-1">
          <div className="w-[22px] h-[22px] rounded bg-gray-200 dark:bg-gray-700" />
          <div className="w-[22px] h-[22px] rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="w-[22px] h-[22px] rounded bg-gray-200 dark:bg-gray-700 ml-auto" />
      </div>
      <div className="px-4 pt-0.5 pb-3">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>
    </div>
  )
}

function Feed() {
  const { user, userId } = useUser()
  const { posts, loading, loadingMore, hasMore, loadMore } = useFeed(userId)
  const storyGroups = useStories(posts)
  const [activeStoryGroup, setActiveStoryGroup] = useState(null)
  const [commentPostId, setCommentPostId] = useState(null)
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

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
        <h1 className="text-lg font-semibold tracking-tight">
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
                    : (group.userId === userId ? 'Tú' : group.username?.slice(0, 2).toUpperCase())
                  }
                </div>
              </div>
              <span className="text-[10px] text-gray-500 max-w-[56px] truncate">
                {group.userId === userId ? 'Tu compra' : group.username}
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
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-3 text-gray-400">
          <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400">Todavía no hay compras</p>
          <p className="text-xs text-gray-400 text-center">¡Seguí a otros usuarios para ver sus compras acá!</p>
        </div>
      ) : (
        <div>
          {posts.map((post, i) => (
            <div key={post.id} className="stagger-enter" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
              <PostCard post={post} currentUserId={userId} onCommentClick={setCommentPostId} />
            </div>
          ))}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-gray-400">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Cargando más...
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="py-6 text-center text-xs text-gray-300">Ya viste todas las compras</div>
          )}
        </div>
      )}

      {commentPostId && (
        <CommentSheet
          postId={commentPostId}
          currentUserId={userId}
          onClose={() => setCommentPostId(null)}
        />
      )}

      {activeStoryGroup !== null && (
        <StoryViewer
          storyGroups={storyGroups}
          activeGroupIndex={activeStoryGroup}
          onClose={() => setActiveStoryGroup(null)}
          onNextGroup={() => {
            if (activeStoryGroup < storyGroups.length - 1) setActiveStoryGroup(g => g + 1)
            else setActiveStoryGroup(null)
          }}
          onPrevGroup={() => {
            if (activeStoryGroup > 0) setActiveStoryGroup(g => g - 1)
            else setActiveStoryGroup(null)
          }}
        />
      )}
    </div>
  )
}

export default Feed
