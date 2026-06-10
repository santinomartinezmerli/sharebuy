import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Chat() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const endRef = useRef(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const { data: conv } = await supabase
        .from('conversations')
        .select('*, user1:user1_id(id, username), user2:user2_id(id, username)')
        .eq('id', conversationId)
        .single()

      if (conv) {
        setOtherUser(conv.user1_id === user.id ? conv.user2 : conv.user1)
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      setMessages(msgs ?? [])
      setLoading(false)
    }
    fetch()
  }, [conversationId])

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim()) return
    const content = newMessage.trim()
    setNewMessage('')

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate('/messages')} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-medium">
          {otherUser?.username?.slice(0, 2).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-900">{otherUser?.username}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Es el comienzo de tu conversación con {otherUser?.username}
          </p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
              msg.sender_id === currentUserId
                ? 'bg-green-500 text-white self-end rounded-br-sm'
                : 'bg-gray-100 text-gray-900 self-start rounded-bl-sm'
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3 bg-white">
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Escribí un mensaje..."
          className="flex-1 bg-gray-50 rounded-full px-4 py-2 text-sm outline-none border border-gray-200 focus:border-green-400"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim()}
          className={`text-sm font-medium ${newMessage.trim() ? 'text-green-500' : 'text-gray-300'}`}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}

export default Chat