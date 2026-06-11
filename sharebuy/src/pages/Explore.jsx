import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'
import { registerRefresh } from '../lib/refreshRegistry'

const CATEGORIES = ['Todo', 'Ropa', 'Tecnología', 'Hogar', 'Deporte', 'Belleza']

function Explore() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todo')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [likedIds, setLikedIds] = useState(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', brand: '' })

  const refreshExplore = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [postsResult, likesResult, blockedResult] = await Promise.all([
      supabase.from('posts').select('*, profiles(id, username, avatar_url)').order('created_at', { ascending: false }).limit(40),
      supabase.from('likes').select('post_id').eq('user_id', user.id),
      supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id)
    ])
    const blockedIds = new Set(blockedResult.data?.map(b => b.blocked_id) ?? [])
    if (!postsResult.error) setPosts((postsResult.data ?? []).filter(p => !blockedIds.has(p.user_id)))
    setLikedIds(new Set(likesResult.data?.map(l => l.post_id) ?? []))
  }, [])

  useEffect(() => registerRefresh(refreshExplore), [refreshExplore])

  useEffect(() => {
    const fetchPosts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const [postsResult, likesResult, blockedResult] = await Promise.all([
        supabase.from('posts').select('*, profiles(id, username, avatar_url)').order('created_at', { ascending: false }),
        supabase.from('likes').select('post_id').eq('user_id', user.id),
        supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id)
      ])

      const blockedIds = new Set(blockedResult.data?.map(b => b.blocked_id) ?? [])
      if (!postsResult.error) setPosts((postsResult.data ?? []).filter(p => !blockedIds.has(p.user_id)))
      setLikedIds(new Set(likesResult.data?.map(l => l.post_id) ?? []))
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

  const handleLike = async (e, postId) => {
    e.stopPropagation()
    const isLiked = likedIds.has(postId)

    if (isLiked) {
      await supabase.from('likes').delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
      setLikedIds(prev => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId })
      setLikedIds(prev => new Set([...prev, postId]))
    }
  }

  const filtered = posts.filter(post => {
    const matchSearch = search === '' ||
      post.product.toLowerCase().includes(search.toLowerCase()) ||
      post.brand?.toLowerCase().includes(search.toLowerCase())

    const matchCategory = category === 'Todo' || post.category === category

    const priceNum = parseFloat(post.price)
    const matchMin = !filters.minPrice || (!isNaN(priceNum) && priceNum >= parseFloat(filters.minPrice))
    const matchMax = !filters.maxPrice || (!isNaN(priceNum) && priceNum <= parseFloat(filters.maxPrice))
    const matchBrand = !filters.brand || post.brand?.toLowerCase().includes(filters.brand.toLowerCase())

    return matchSearch && matchCategory && matchMin && matchMax && matchBrand
  })

  const brands = [...new Set(posts.map(p => p.brand).filter(Boolean))].sort()

  return (
    <div className="flex flex-col dark:bg-gray-900 dark:text-white">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-600 flex-1 transition-colors focus-within:border-green-400">
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
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-xl border transition-colors ${showFilters ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400' : 'border-gray-200 dark:border-gray-600 text-gray-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Precio mínimo</label>
              <input
                value={filters.minPrice}
                onChange={e => setFilters({ ...filters, minPrice: e.target.value })}
                placeholder="$0"
                type="number"
                className="w-full mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Precio máximo</label>
              <input
                value={filters.maxPrice}
                onChange={e => setFilters({ ...filters, maxPrice: e.target.value })}
                placeholder="$999"
                type="number"
                className="w-full mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Marca</label>
            <select
              value={filters.brand}
              onChange={e => setFilters({ ...filters, brand: e.target.value })}
              className="w-full mt-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white"
            >
              <option value="">Todas las marcas</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <button
            onClick={() => setFilters({ minPrice: '', maxPrice: '', brand: '' })}
            className="text-xs text-gray-500 self-end"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Users results */}
      {search.length >= 2 && users.length > 0 && (
        <div className="border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide px-4 pt-3 pb-2">Usuarios</p>
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => navigate(`/user/${user.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium flex-shrink-0 overflow-hidden">
                {user.avatar_url
                  ? <img src={user.avatar_url} className="w-full h-full object-cover" />
                  : user.username?.slice(0, 2).toUpperCase()}
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

      {/* Categories */}
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

      {/* Posts grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-0.5 p-0.5">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 animate-pulse rounded-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          title={search || filters.brand || filters.minPrice ? 'No se encontró nada' : 'Todavía no hay publicaciones'}
          subtitle={search || filters.brand || filters.minPrice ? 'Probá con otro término o ajustá los filtros' : 'Las compras de la comunidad aparecen acá'}
        />
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-0.5 p-0.5">
            {filtered.map((post, index) => (
              <div
                key={post.id}
                className={`bg-gray-50 dark:bg-gray-800 overflow-hidden relative rounded-sm ${index % 3 === 0 ? 'row-span-2' : ''}`}
                style={{ aspectRatio: index % 3 === 0 ? '3/4' : '1/1' }}
              >
                <button onClick={() => navigate(`/post/${post.id}`)} className="w-full h-full active:opacity-80 transition-opacity">
                  {(post.image_urls?.[0] || post.image_url) ? (
                    <img src={post.image_urls?.[0] ?? post.image_url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-green-50 dark:bg-green-900/20">🛍️</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/user/${post.profiles?.id ?? post.user_id}`) }}
                      className="flex items-center gap-1 mb-0.5"
                    >
                      <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-white text-[8px] font-medium overflow-hidden flex-shrink-0">
                        {post.profiles?.avatar_url
                          ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                          : post.profiles?.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-white text-[10px] font-medium truncate">{post.profiles?.username}</span>
                    </button>
                    <p className="text-white text-xs font-medium truncate">{post.product}</p>
                    {post.price && <p className="text-green-300 text-xs font-medium">${post.price}</p>}
                  </div>
                </button>

                <button
                  onClick={e => handleLike(e, post.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-all ${likedIds.has(post.id) ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Explore
