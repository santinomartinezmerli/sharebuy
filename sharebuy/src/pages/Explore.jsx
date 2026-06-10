import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['Todo', 'Ropa', 'Tecnología', 'Hogar', 'Deporte', 'Belleza']

function Explore() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todo')
  const [tab, setTab] = useState('posts')

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false })

      if (!error) setPosts(data)
      setLoading(false)
    }

    fetchPosts()
  }, [])

  useEffect(() => {
    const searchUsers = async () => {
      if (search.length < 2) { setUsers([]); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${search}%`)
        .limit(10)

      setUsers(data ?? [])
    }

    searchUsers()
  }, [search])

  const filtered = posts.filter(post => {
    const matchSearch = search === '' ||
      post.product.toLowerCase().includes(search.toLowerCase()) ||
      post.brand?.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'Todo' || post.category === category
    return matchSearch && matchCategory
  })

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar productos, marcas o usuarios..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {search.length >= 2 && users.length > 0 && (
        <div className="border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide px-4 pt-3 pb-2">Usuarios</p>
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => navigate(`/user/${user.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium flex-shrink-0">
                {user.username?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                {user.bio && <p className="text-xs text-gray-400 truncate">{user.bio}</p>}
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-gray-100">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              category === cat
                ? 'bg-green-500 text-white'
                : 'border border-gray-200 text-gray-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <p className="text-sm">No se encontró nada</p>
          <p className="text-xs">Probá con otro término</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-0.5 p-0.5">
          {filtered.map((post, index) => (
            <button
              key={post.id}
              onClick={() => navigate(`/post/${post.id}`)}
              className={`bg-gray-50 overflow-hidden relative ${index % 3 === 0 ? 'row-span-2' : ''}`}
              style={{ aspectRatio: index % 3 === 0 ? '3/4' : '1/1' }}
            >
              {post.image_url ? (
                <img src={post.image_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl bg-green-50">
                  🛍️
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{post.product}</p>
                {post.price && <p className="text-green-300 text-xs">${post.price}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Explore