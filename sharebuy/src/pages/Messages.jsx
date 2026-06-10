import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Messages() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const { data } = await supabase
        .from('conversations')
        .select('*, user1:user1_id(id, username), user2:user2_id(id, username)')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      setConversations(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
  )

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">Mensajes</span>
        <div className="w-6" />
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">Sin mensajes todavía</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {conversations.map(conv => {
            const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1
            return (
              <button
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50"
              >
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium flex-shrink-0">
                  {other?.username?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{other?.username}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Messages