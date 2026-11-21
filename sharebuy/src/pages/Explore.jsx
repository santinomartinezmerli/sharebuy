import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useUser } from '../lib/UserContext.jsx'
import EmptyState from '../components/EmptyState'
import { motion } from 'framer-motion'
import { useExplore } from '../hooks/useExplore'
import { useExploreLike } from '../hooks/useExploreLike'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { fetchBrands, searchUsers } from '../services/explore'
const CATEGORIES = ['Todo', 'Ropa', 'Tecnología', 'Hogar', 'Deporte', 'Belleza']

function Explore() {
  const navigate = useNavigate()
  const { userId } = useUser()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todo')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', brand: '' })
  const sentinelRef = useRef(null)

  // Search, category, price and brand are filtered on the server (get_explore). Wait 300 ms
  // after the last change before asking, so typing does not fire one request per key.
  const dSearch = useDebouncedValue(search, 300)
  const dCategory = useDebouncedValue(category, 300)
  const dMinPrice = useDebouncedValue(filters.minPrice, 300)
  const dMaxPrice = useDebouncedValue(filters.maxPrice, 300)
  const dBrand = useDebouncedValue(filters.brand, 300)
  const criteria = useMemo(
    () => ({ search: dSearch, category: dCategory, brand: dBrand, minPrice: dMinPrice, maxPrice: dMaxPrice }),
    [dSearch, dCategory, dBrand, dMinPrice, dMaxPrice]
  )

  // 24 posts per request. Pull-to-refresh is registered inside useExplore.
  const { posts, loading, updating, loadingMore, hasMore, loadMore } = useExplore(userId, criteria)
  const { toggleLike } = useExploreLike(userId)

  // The brand list is only requested the first time the filters panel is opened.
  const { data: brandOptions } = useQuery({
    queryKey: ['exploreBrands'],
    queryFn: fetchBrands,
    enabled: showFilters,
    staleTime: 5 * 60_000,
  })
  const brands = (brandOptions ?? []).map(b => b.brand)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (dSearch.length < 2) { setUsers([]); return }
      const found = await searchUsers(dSearch)
      if (!cancelled) setUsers(found)
    }
    run()
    return () => { cancelled = true }
  }, [dSearch])

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

  const handleLike = (e, post) => {
    e.stopPropagation()
    toggleLike(post)
  }

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
      ) : posts.length === 0 ? (
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
          <div className={`grid grid-cols-2 gap-0.5 p-0.5 transition-opacity ${updating ? 'opacity-60' : ''}`}>
            {posts.map((post, index) => (
              <div
                key={post.id}
                className={`bg-gray-50 dark:bg-gray-800 overflow-hidden relative rounded-sm ${index % 3 === 0 ? 'row-span-2' : ''}`}
                style={{ aspectRatio: index % 3 === 0 ? '3/4' : '1/1' }}
              >
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate(`/post/${post.id}`)} className="w-full h-full active:opacity-80 transition-opacity">
                  {(post.image_urls?.[0] || post.image_url) ? (
                    <img src={post.image_urls?.[0] ?? post.image_url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt="" loading="lazy" decoding="async" />
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
                </motion.button>

                <button
                  onClick={e => handleLike(e, post)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-all ${post.liked_by_me ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="py-4 text-center text-xs text-gray-400">Cargando más...</div>
          )}
        </div>
      )}
    </div>
  )
}

export default Explore
