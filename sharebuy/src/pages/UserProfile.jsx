import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/UserContext.jsx'
import { SkeletonProfile } from '../components/Skeleton'
import { motion } from 'framer-motion'
import { useProfile } from '../hooks/useProfile'
import { useProfilePosts } from '../hooks/useProfilePosts'
import { useProfileRelationship } from '../hooks/useProfileRelationship'

function UserProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { userId: currentUserId } = useUser()
  const sentinelRef = useRef(null)

  // Header (profile, counts, do I follow / did I block) and posts are cached for 60s:
  // coming back to a profile you just saw is instant.
  const { data: summary, isPending: summaryPending } = useProfile(userId, currentUserId)
  const { posts, total, loading: postsLoading, loadingMore, hasMore, loadMore } = useProfilePosts(userId)
  const { toggleFollow: handleFollow, toggleBlock: handleBlock } = useProfileRelationship(userId, currentUserId)
  const profile = summary?.profile ?? null
  const followersCount = summary?.followersCount ?? 0
  const followingCount = summary?.followingCount ?? 0
  const following = !!summary?.following
  const blocked = !!summary?.blocked

  // Infinite scroll: same observer as the feed.
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore()
      }
    }, { threshold: 0.1 })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loadMore, hasMore, loadingMore])

  const handleMessage = async () => {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${currentUserId})`)
      .maybeSingle()

    if (existing) {
      navigate(`/messages/${existing.id}`)
      return
    }

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ user1_id: currentUserId, user2_id: userId })
      .select('id')
      .single()

    if (!error) navigate(`/messages/${newConv.id}`)
  }

  if (summaryPending || postsLoading) return <SkeletonProfile />

  return (
    <div className="flex flex-col dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{profile?.username}</span>
        <div className="w-6" />
      </div>

      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xl font-medium overflow-hidden flex-shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" />
              : profile?.username?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex gap-6 flex-1 justify-center">
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold text-gray-900 dark:text-white">{total}</span>
              <span className="text-[11px] text-gray-400">compras</span>
            </div>
            <button
              onClick={() => navigate(`/user/${userId}/follow?type=followers`)}
              className="flex flex-col items-center"
            >
              <span className="text-base font-semibold text-gray-900 dark:text-white">{followersCount}</span>
              <span className="text-[11px] text-gray-400">seguidores</span>
            </button>
            <button
              onClick={() => navigate(`/user/${userId}/follow?type=following`)}
              className="flex flex-col items-center"
            >
              <span className="text-base font-semibold text-gray-900 dark:text-white">{followingCount}</span>
              <span className="text-[11px] text-gray-400">siguiendo</span>
            </button>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.username}</p>
        {profile?.bio && <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{profile.bio}</p>}

        {currentUserId !== userId && (
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex gap-3">
              <button
                onClick={handleFollow}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  following
                    ? 'border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                    : 'bg-green-500 text-white'
                }`}
              >
                {following ? 'Siguiendo' : 'Seguir'}
              </button>
              <button
                onClick={handleMessage}
                className="flex-1 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Mensaje
              </button>
            </div>
            <button
              onClick={handleBlock}
              className={`text-xs self-end transition-colors ${blocked ? 'text-gray-400' : 'text-red-400'}`}
            >
              {blocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
            </button>
          </div>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <p className="text-sm">Sin compras todavía</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <motion.button
              key={post.id} whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/post/${post.id}`)}
              className="aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden"
            >
              {post.image_url ? (
                <img src={post.image_url} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
              )}
            </motion.button>
          ))}
        </div>
        <div ref={sentinelRef} className="h-1" />
        {loadingMore && (
          <div className="py-4 text-center text-xs text-gray-400">Cargando más...</div>
        )}
        </>
      )}
    </div>
  )
}

export default UserProfile