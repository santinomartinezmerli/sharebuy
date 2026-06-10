import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Profile() {
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setProfile(profileData)
      setPosts(postsData ?? [])
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
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>

      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xl font-medium">
            {profile?.username?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex gap-6 flex-1 justify-center">
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold text-gray-900">{posts.length}</span>
              <span className="text-xs text-gray-400">compras</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold text-gray-900">0</span>
              <span className="text-xs text-gray-400">seguidores</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold text-gray-900">0</span>
              <span className="text-xs text-gray-400">siguiendo</span>
            </div>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-900">{profile?.username}</p>
        {profile?.bio && <p className="text-sm text-gray-500 mt-1">{profile.bio}</p>}
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <p className="text-sm">Todavía no publicaste nada</p>
          <p className="text-xs">¡Compartí tu primera compra!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <div key={post.id} className="aspect-square bg-gray-50 overflow-hidden">
              {post.image_url ? (
                <img src={post.image_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  🛍️
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Profile