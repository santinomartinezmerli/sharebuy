import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useUser } from '../lib/UserContext.jsx'
import { SkeletonList } from '../components/Skeleton'
import { useFollowList, useToggleFollowInList } from '../hooks/useFollowList'

function FollowList() {
  const { userId } = useParams()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') || 'followers'
  const navigate = useNavigate()
  const { userId: currentUserId } = useUser()
  const sentinelRef = useRef(null)

  // 30 users per page, most recent follow first. Each user carries `following` (do I follow
  // them), looked up only for the ids of its page. Cached for 60s: coming back is instant.
  const { users, loading, loadingMore, hasMore, loadMore } = useFollowList(userId, type, currentUserId)
  const { toggle: handleFollow } = useToggleFollowInList(currentUserId)

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

  return (
    <div className="flex flex-col dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
        </span>
        <div className="w-6" />
      </div>

      {loading ? (
        <SkeletonList count={8} />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <p className="text-sm">
            {type === 'followers' ? 'Sin seguidores todavía' : 'No sigue a nadie todavía'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {users.map(user => {
            const isOwn = user.id === currentUserId
            const isFollowing = user.following
            return (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                <button
                  onClick={() => navigate(`/user/${user.id}`)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium`}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      : user.username?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                    {user.bio && <p className="text-xs text-gray-400 truncate">{user.bio}</p>}
                  </div>
                </button>
                {!isOwn && (
                  <button
                    onClick={() => handleFollow(user)}
                    className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isFollowing
                        ? 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                        : 'bg-green-500 text-white'
                    }`}
                  >
                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
              </div>
            )
          })}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="py-4 text-center text-xs text-gray-400">Cargando más...</div>
          )}
        </div>
      )}
    </div>
  )
}

export default FollowList