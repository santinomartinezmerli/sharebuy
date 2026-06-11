import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function FollowList() {
  const { userId } = useParams()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') || 'followers'
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      let query

      if (type === 'followers') {
        query = await supabase
          .from('follows')
          .select('profiles:follower_id(id, username, bio)')
          .eq('following_id', userId)
      } else {
        query = await supabase
          .from('follows')
          .select('profiles:following_id(id, username, bio)')
          .eq('follower_id', userId)
      }

      setUsers(query.data?.map(d => d.profiles) ?? [])
      setLoading(false)
    }
    fetch()
  }, [userId, type])

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">
          {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
        </span>
        <div className="w-6" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <p className="text-sm">
            {type === 'followers' ? 'Sin seguidores todavía' : 'No sigue a nadie todavía'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => navigate(`/user/${user.id}`)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium flex-shrink-0">
                {user.username?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                {user.bio && <p className="text-xs text-gray-400 truncate">{user.bio}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default FollowList