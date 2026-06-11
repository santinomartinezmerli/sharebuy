import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      const { data: postsData } = await supabase
        .from('posts').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { count: followers } = await supabase
        .from('follows').select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)

      const { count: followingC } = await supabase
        .from('follows').select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)

      setProfile(profileData)
      setPosts(postsData ?? [])
      setFollowersCount(followers ?? 0)
      setFollowingCount(followingC ?? 0)
      setLoading(false)
    }

    fetchProfile()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">
      Cargando...
    </div>
  )

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-900">{profile?.username}</span>
        <button onClick={() => navigate('/edit-profile')} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xl font-medium overflow-hidden flex-shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" />
              : profile?.username?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex gap-6 flex-1 justify-center">
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold text-gray-900">{posts.length}</span>
              <span className="text-xs text-gray-400">compras</span>
            </div>
            <button
              onClick={() => userId && navigate(`/user/${userId}/follow?type=followers`)}
              className="flex flex-col items-center"
            >
              <span className="text-base font-semibold text-gray-900">{followersCount}</span>
              <span className="text-xs text-gray-400">seguidores</span>
            </button>
            <button
              onClick={() => userId && navigate(`/user/${userId}/follow?type=following`)}
              className="flex flex-col items-center"
            >
              <span className="text-base font-semibold text-gray-900">{followingCount}</span>
              <span className="text-xs text-gray-400">siguiendo</span>
            </button>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-900">{profile?.username}</p>
        {profile?.bio && <p className="text-sm text-gray-500 mt-1">{profile.bio}</p>}

        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-3 text-xs text-red-400"
        >
          Cerrar sesión
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <p className="text-sm">Todavía no publicaste nada</p>
          <p className="text-xs">¡Compartí tu primera compra!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <button
              key={post.id}
              onClick={() => navigate(`/post/${post.id}`)}
              className="aspect-square bg-gray-50 overflow-hidden"
            >
              {(post.image_urls?.[0] || post.image_url) ? (
                <img src={post.image_urls?.[0] ?? post.image_url} className="w-full h-full object-cover" />
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

export default Profile