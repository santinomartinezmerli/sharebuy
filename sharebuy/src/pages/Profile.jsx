import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/UserContext.jsx'
import { SkeletonProfile } from '../components/Skeleton'
import { motion } from 'framer-motion'

function Profile() {
  const navigate = useNavigate()
  const { userId } = useUser()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [savedPosts, setSavedPosts] = useState([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('posts')

  useEffect(() => {
    if (!userId) return
    const fetchProfile = async () => {
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

      const { data: savedData } = await supabase
        .from('saves')
        .select('post_id')
        .eq('user_id', userId)

      if (savedData && savedData.length > 0) {
        const savedIds = savedData.map(s => s.post_id)
        const { data: sp } = await supabase
          .from('posts')
          .select('*, profiles(username, avatar_url)')
          .in('id', savedIds)
          .order('created_at', { ascending: false })
        setSavedPosts(sp ?? [])
      }

      setProfile(profileData)
      setPosts(postsData ?? [])
      setFollowersCount(followers ?? 0)
      setFollowingCount(followingC ?? 0)
      setLoading(false)
    }

    fetchProfile()
  }, [userId])

  if (loading) return <SkeletonProfile />

  const grid = (tab === 'posts' ? posts : savedPosts)

  return (
    <div className="flex flex-col dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-900 dark:text-white">{profile?.username}</span>
        <button onClick={() => navigate('/edit-profile')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Editar perfil">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-6 mb-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xl font-medium overflow-hidden flex-shrink-0 ring-2 ring-gray-100 dark:ring-gray-700">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" />
              : profile?.username?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex gap-8 flex-1 justify-center">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{posts.length}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">compras</span>
            </div>
            <button onClick={() => userId && navigate(`/user/${userId}/follow?type=followers`)} className="flex flex-col items-center active:opacity-60 transition-opacity">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{followersCount}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">seguidores</span>
            </button>
            <button onClick={() => userId && navigate(`/user/${userId}/follow?type=following`)} className="flex flex-col items-center active:opacity-60 transition-opacity">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{followingCount}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">siguiendo</span>
            </button>
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.username}</p>
        {profile?.bio && <p className="text-sm text-gray-500 dark:text-gray-300 mt-1 leading-relaxed">{profile.bio}</p>}
        <div className="flex items-center gap-2 mt-4">
          <button onClick={() => navigate('/edit-profile')}
            className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
            Editar perfil
          </button>
          <button onClick={() => supabase.auth.signOut()}
            className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-400 dark:text-gray-500 active:bg-gray-50 dark:active:bg-gray-800 transition-colors" title="Cerrar sesión">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => setTab('posts')} className={`flex-1 py-3 text-xs font-medium text-center border-b-2 transition-colors ${tab === 'posts' ? 'border-green-500 text-green-500' : 'border-transparent text-gray-400 dark:text-gray-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mx-auto mb-0.5" fill={tab === 'posts' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Publicaciones
        </button>
        <button onClick={() => setTab('saved')} className={`flex-1 py-3 text-xs font-medium text-center border-b-2 transition-colors ${tab === 'saved' ? 'border-green-500 text-green-500' : 'border-transparent text-gray-400 dark:text-gray-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 mx-auto mb-0.5 ${tab === 'saved' ? 'text-yellow-500' : ''}`} fill={tab === 'saved' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Guardados
        </button>
      </div>

      {grid.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 gap-2 text-gray-400">
          <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab === 'posts' ? "M4 6h16M4 12h16M4 18h16" : "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"} />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400">{tab === 'posts' ? 'Sin publicaciones' : 'Sin guardados'}</p>
          <p className="text-xs text-gray-400">{tab === 'posts' ? 'Tus compras aparecen acá' : 'Tocá el marcador en los posts'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1">
          {grid.map(post => (
            <motion.button key={post.id} whileTap={{ scale: 0.95 }} onClick={() => navigate(`/post/${post.id}`)}
              className="aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden rounded-sm active:opacity-80 transition-opacity">
              {(post.image_urls?.[0] || post.image_url) ? (
                <img src={post.image_urls?.[0] ?? post.image_url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
              )}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Profile
