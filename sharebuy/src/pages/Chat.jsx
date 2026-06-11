import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Avatar from '../components/Avatar'

function Chat() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [typing, setTyping] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [readMap, setReadMap] = useState({})
  const endRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const { data: conv } = await supabase
        .from('conversations')
        .select('*, user1:user1_id(id, username, avatar_url), user2:user2_id(id, username, avatar_url)')
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

      // Mark unread messages as read
      const unreadIds = (msgs ?? [])
        .filter(m => m.sender_id !== user.id && !m.read_at)
        .map(m => m.id)

      if (unreadIds.length > 0) {
        await supabase.from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds)
      }

      setLoading(false)
    }
    fetch()
  }, [conversationId])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase.channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        const msg = payload.new
        setMessages(prev => [...prev, msg])
        // Auto-mark as read
        if (msg.sender_id !== currentUserId) {
          await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
          setReadMap(prev => ({ ...prev, [msg.id]: true }))
        }
        setOtherTyping(false)
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== currentUserId) {
          setOtherTyping(true)
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, otherTyping])

  const handleSend = async () => {
    if (!newMessage.trim()) return
    const content = newMessage.trim()
    setNewMessage('')
    await supabase.from('messages').insert({
      conversation_id: conversationId, sender_id: currentUserId, content
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTyping = () => {
    if (!typing) {
      setTyping(true)
      supabase.channel(`chat-${conversationId}`).send({
        type: 'broadcast', event: 'typing',
        payload: { user_id: currentUserId }
      })
      setTimeout(() => setTyping(false), 2000)
    }
  }

  const handleSendPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)

    const ext = file.name.split('.').pop()
    const filename = `chat-${currentUserId}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('chat')
      .upload(filename, file)

    if (uploadError) {
      setUploadError(`Error al subir foto: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('chat').getPublicUrl(filename)
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: urlData.publicUrl,
      is_image: true,
    })

    setUploading(false)
    e.target.value = ''
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
  )

  return (
    <div className="flex flex-col h-full dark:bg-gray-900 dark:text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => navigate('/messages')} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Avatar url={otherUser?.avatar_url} username={otherUser?.username} size="md" />
        <span className="text-sm font-medium text-gray-900">{otherUser?.username}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Es el comienzo de tu conversación con {otherUser?.username}
          </p>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`max-w-[75%] flex flex-col ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
              {msg.is_image ? (
                <img src={msg.content} className="w-48 h-48 object-cover rounded-2xl" alt="" />
              ) : (
                <div className={`px-3 py-2 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-green-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              )}
              {isMine && (
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {msg.read_at ? '✓✓ Leído' : '✓ Enviado'}
                </span>
              )}
            </div>
          )
        })}
        {otherTyping && (
          <div className="self-start bg-gray-100 rounded-2xl px-3 py-2 text-sm text-gray-500 rounded-bl-sm">
            {otherUser?.username} está escribiendo...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {uploadError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-600">
          {uploadError}
        </div>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3 bg-white dark:bg-gray-900">
        <input type="file" accept="image/*" onChange={handleSendPhoto} className="hidden" ref={fileInputRef} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-gray-400 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <textarea
          value={newMessage}
          onChange={e => { setNewMessage(e.target.value); handleTyping() }}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje..."
          rows={1}
          className="flex-1 bg-gray-50 rounded-2xl px-4 py-2 text-sm outline-none border border-gray-200 focus:border-green-400 resize-none max-h-20"
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
