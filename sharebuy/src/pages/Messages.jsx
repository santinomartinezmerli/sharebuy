import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'


function Messages() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user.id)

    const [convResult, blockedResult] = await Promise.all([
      supabase.from('conversations')
        .select('*, user1:user1_id(id, username, avatar_url), user2:user2_id(id, username, avatar_url)')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id)
    ])

    const blockedIds = new Set(blockedResult.data?.map(b => b.blocked_id) ?? [])
    const filtered = (convResult.data ?? []).filter(conv => {
      const other = conv.user1_id === user.id ? conv.user2 : conv.user1
      return other && !blockedIds.has(other.id)
    })

    const convIds = filtered.map(c => c.id)
    const lastMsgMap = {}
    const unreadMap = {}

    if (convIds.length > 0) {
      const { data: allMsgs } = await supabase.from('messages')
        .select('conversation_id, id, sender_id, created_at, content')
        .in('conversation_id', convIds).order('created_at', { ascending: false }).limit(1000)

      let lastRead = {}
      try { lastRead = JSON.parse(localStorage.getItem('chatLastRead') || '{}') } catch (e) {}
      const seenConv = new Set()

      for (const msg of allMsgs ?? []) {
        if (!seenConv.has(msg.conversation_id)) {
          lastMsgMap[msg.conversation_id] = msg
          seenConv.add(msg.conversation_id)
        }
        const lastReadAt = lastRead[msg.conversation_id]
        if (msg.sender_id !== user.id && (!lastReadAt || new Date(msg.created_at).getTime() > lastReadAt)) {
          unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] ?? 0) + 1
        }
      }
    }

    setConversations(filtered.map(c => ({
      ...c,
      lastMessage: lastMsgMap[c.id] ?? null,
      unreadCount: unreadMap[c.id] ?? 0,
    })))
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const onVisible = () => { if (!document.hidden) fetchData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    window.__ptrRefresh = fetchData
    const handler = () => fetchData()
    window.addEventListener('ptr-refresh', handler)
    return () => { window.removeEventListener('ptr-refresh', handler); window.__ptrRefresh = null }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
  )

  return (
    <div className="flex flex-col dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => navigate(-1)} className="text-gray-400 p-1 active:scale-95 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-white">Mensajes</span>
        <div className="w-6" />
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
          title="Sin mensajes todavía"
          subtitle="Comentá en publicaciones o seguí usuarios para empezar a chatear"
        />
      ) : (
        <div className="flex flex-col">
          {conversations.map(conv => {
            const other = conv.user1_id === currentUserId ? conv.user2 : conv.user1
            return (
              <button
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:bg-gray-100 dark:active:bg-gray-700"
              >
                <Avatar url={other?.avatar_url} username={other?.username} size="lg" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{other?.username}</p>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 bg-green-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {conv.lastMessage.sender_id === currentUserId
                        ? '✓ Enviado'
                        : /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(conv.lastMessage.content)
                          ? '📷 Foto'
                          : conv.lastMessage.content}
                    </p>
                  )}
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
