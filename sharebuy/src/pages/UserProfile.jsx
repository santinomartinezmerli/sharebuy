import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function UserProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [following, setFollowing] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', userId).single()

      const { data: postsData } = await supabase
        .from('posts').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false })

      const { count: followers } = await supabase
        .from('follows').select('*', { count: 'exact', head: true })
        .eq('following_id', userId)

      const { count: followingC } = await supabase
        .from('follows').select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)

      const { data: followData } = await supabase
        .from('follows').select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle()

      const { data: blockData } = await supabase
        .from('blocked_users').select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle()

      setProfile(profileData)
      setPosts(postsData ?? [])
      setFollowersCount(followers ?? 0)
      setFollowingCount(followingC ?? 0)
      setFollowing(!!followData)
      setBlocked(!!blockData)
      setLoading(false)
    }
    fetch()
  }, [userId])

  const handleFollow = async () => {
    setFollowLoading(true)
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)
      setFollowing(false)
      setFollowersCount(prev => prev - 1)
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUserId,
        following_id: userId
      })
      setFollowing(true)
      setFollowersCount(prev => prev + 1)
    }
    setFollowLoading(false)
  }

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

  const handleBlock = async () => {
    if (blocked) {
      await supabase.from('blocked_users').delete()
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', userId)
      setBlocked(false)
    } else {
      await supabase.from('blocked_users').insert({
        blocker_id: currentUserId, blocked_id: userId
      })
      setBlocked(true)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
  )

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
              <span className="text-base font-semibold text-gray-900 dark:text-white">{posts.length}</span>
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
                disabled={followLoading}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                  following
                    ? 'border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                    : 'bg-green-500 text-white'
                }`}
              >
                {followLoading ? '...' : (following ? 'Siguiendo' : 'Seguir')}
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
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <button
              key={post.id}
              onClick={() => navigate(`/post/${post.id}`)}
              className="aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden"
            >
              {post.image_url ? (
                <img src={post.image_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default UserProfile