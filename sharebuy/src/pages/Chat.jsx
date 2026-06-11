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
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editText, setEditText] = useState('')
  const [deletingMsgId, setDeletingMsgId] = useState(null)
  const [typing, setTyping] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [readMap, setReadMap] = useState({})
  const endRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Mark conversation as read immediately on mount (not just after async fetch)
  useEffect(() => {
    const prev = JSON.parse(localStorage.getItem('chatLastRead') || '{}')
    prev[conversationId] = Date.now()
    localStorage.setItem('chatLastRead', JSON.stringify(prev))
  }, [conversationId])

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

      // Mark unread messages as read in DB (if column exists)
      const unreadIds = (msgs ?? [])
        .filter(m => m.sender_id !== user.id && !m.read_at)
        .map(m => m.id)
      if (unreadIds.length > 0) {
        const { error } = await supabase.from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds)
        if (error) console.warn('read_at update failed (column may not exist yet)')
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
        // Keep localStorage timestamp fresh for badge clearance
        const prev = JSON.parse(localStorage.getItem('chatLastRead') || '{}')
        prev[conversationId] = Date.now()
        localStorage.setItem('chatLastRead', JSON.stringify(prev))
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
    if (endRef.current) {
      const el = endRef.current.parentElement
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [messages, otherTyping])

  const handleSend = async () => {
    const text = newMessage.trim()
    setNewMessage('')

    if (!text && pendingPhotos.length === 0) return

    const photos = [...pendingPhotos]
    setPendingPhotos([])

    if (photos.length > 0) {
      setUploading(true)
      setUploadError(null)

      for (const photo of photos) {
        const ext = photo.file.name.split('.').pop()
        const filename = `chat-${currentUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('chat')
          .upload(filename, photo.file)

        if (uploadError) {
          setUploadError(uploadError.message)
          setUploading(false)
          return
        }

        const { data: urlData } = supabase.storage.from('chat').getPublicUrl(filename)
        await supabase.from('messages').insert({
          conversation_id: conversationId, sender_id: currentUserId,
          content: urlData.publicUrl,
        })
      }

      setUploading(false)
    }

    if (text) {
      await supabase.from('messages').insert({
        conversation_id: conversationId, sender_id: currentUserId, content: text
      })
    }
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

  const handleSelectPhoto = (e) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploadError(null)
    setPendingPhotos(prev => {
      const combined = [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]
      return combined.slice(0, 6)
    })
    e.target.value = ''
  }

  const handleRemovePhoto = (index) => {
    setPendingPhotos(prev => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleEditMessage = (msg) => {
    setEditingMsgId(msg.id)
    setEditText(msg.content)
  }

  const handleSaveEdit = async (msgId) => {
    const text = editText.trim()
    if (!text || text === messages.find(m => m.id === msgId)?.content) {
      setEditingMsgId(null)
      return
    }
    await supabase.from('messages').update({ content: text, updated_at: new Date().toISOString() }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: text, updated_at: new Date().toISOString() } : m))
    setEditingMsgId(null)
  }

  const handleDeleteMessage = async (msgId) => {
    await supabase.from('messages').delete().eq('id', msgId)
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setDeletingMsgId(null)
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
        <button onClick={() => navigate(`/user/${otherUser?.id}`)} className="flex items-center gap-3 cursor-pointer hover:opacity-80">
          <Avatar url={otherUser?.avatar_url} username={otherUser?.username} size="md" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{otherUser?.username}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Es el comienzo de tu conversación con {otherUser?.username}
          </p>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === currentUserId
          const isImage = msg.is_image || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(msg.content)
          const isEditing = editingMsgId === msg.id
          const isDeleting = deletingMsgId === msg.id
          return (
            <div key={msg.id} className={`max-w-[75%] flex flex-col ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
              {isImage ? (
                <div className="relative group">
                  <img src={msg.content} className="w-48 h-48 object-cover rounded-2xl" alt="" />
                  {isMine && (
                    <button onClick={() => handleDeleteMessage(msg.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ) : isEditing ? (
                <div className="flex flex-col gap-1 items-end">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={2}
                    className="bg-green-100 text-gray-900 px-3 py-2 rounded-2xl text-sm outline-none resize-none w-56"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingMsgId(null)} className="text-[10px] text-gray-400">Cancelar</button>
                    <button onClick={() => handleSaveEdit(msg.id)} className="text-[10px] text-green-600 font-medium">Guardar</button>
                  </div>
                </div>
              ) : (
                <div className={`relative group px-3 py-2 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-green-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}>
                  {msg.content}
                  {isMine && !isDeleting && (
                    <div className="absolute -top-4 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditMessage(msg)} className="text-[10px] text-gray-400 hover:text-gray-600">✎</button>
                      <button onClick={() => setDeletingMsgId(msg.id)} className="text-[10px] text-red-400 hover:text-red-600">✕</button>
                    </div>
                  )}
                  {isDeleting && (
                    <div className="flex gap-2 mt-1 justify-end">
                      <button onClick={() => setDeletingMsgId(null)} className="text-[10px] text-gray-400">Cancelar</button>
                      <button onClick={() => handleDeleteMessage(msg.id)} className="text-[10px] text-red-400 font-medium">Eliminar</button>
                    </div>
                  )}
                </div>
              )}
              {isMine && !isEditing && (
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

      {pendingPhotos.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex gap-2 flex-wrap">
            {pendingPhotos.map((photo, i) => (
              <div key={i} className="relative">
                <img src={photo.preview} className="w-16 h-16 object-cover rounded-xl" alt="" />
                <button onClick={() => handleRemovePhoto(i)} className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-600">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3 bg-white dark:bg-gray-900">
        <input type="file" accept="image/*" multiple onChange={handleSelectPhoto} className="hidden" ref={fileInputRef} />
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
          className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-2 text-sm outline-none border border-gray-200 dark:border-gray-600 focus:border-green-400 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none max-h-20"
        />
        <button
          onClick={handleSend}
          disabled={(!newMessage.trim() && pendingPhotos.length === 0) || uploading}
          className={`text-sm font-medium ${(newMessage.trim() || pendingPhotos.length > 0) && !uploading ? 'text-green-500' : 'text-gray-300'}`}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}

export default Chat
