import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Avatar from './Avatar'

function CommentSheet({ postId, currentUserId, onClose }) {
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [visible, setVisible] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setVisible(true)
    const fetch = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      setComments(data ?? [])
      setLoading(false)
    }
    fetch()
    setTimeout(() => inputRef.current?.focus(), 400)
  }, [postId])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const handleSend = async () => {
    if (!newComment.trim()) return
    setSending(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: currentUserId, content: newComment.trim() })
      .select('*, profiles(username, avatar_url)')
      .single()
    if (!error) {
      setComments(prev => [...prev, data])
      setNewComment('')
    }
    setSending(false)
  }

  const handleDelete = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return
    await supabase.from('comments').update({ content: editText.trim() }).eq('id', commentId)
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editText.trim() } : c))
    setEditingId(null)
    setEditText('')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 transition-all duration-250"
        style={{ opacity: visible ? 1 : 0, backgroundColor: visible ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)' }}
        onClick={handleClose}
      />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-t-2xl flex flex-col shadow-2xl"
        style={{ maxHeight: '75vh', transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Comentarios</span>
          <span className="text-xs text-gray-400">{comments.length > 0 ? comments.length : ''}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="animate-spin w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-gray-400">Sin comentarios todavía</p>
              <p className="text-xs text-gray-400">Sé el primero en comentar</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-2.5">
                  <button onClick={() => { handleClose(); navigate(`/user/${comment.user_id}`); }} className="flex-shrink-0 mt-0.5">
                    <Avatar url={comment.profiles?.avatar_url} username={comment.profiles?.username} size="sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    {editingId === comment.id ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 outline-none focus:border-green-400 dark:bg-gray-800 dark:text-white transition-colors"
                          autoFocus
                        />
                        <div className="flex gap-3">
                          <button onClick={() => handleEdit(comment.id)} className="text-xs text-green-500 font-medium active:scale-95">Guardar</button>
                          <button onClick={() => { setEditingId(null); setEditText('') }} className="text-xs text-gray-400 active:scale-95">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button onClick={() => navigate(`/user/${comment.user_id}`)} className="text-sm font-semibold text-gray-900 dark:text-white hover:underline transition-opacity active:opacity-60">{comment.profiles?.username}</button>
                        <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">{comment.content}</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">{new Date(comment.created_at).toLocaleDateString('es-AR')}</p>
                      </div>
                    )}
                  </div>
                  {comment.user_id === currentUserId && editingId !== comment.id && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => { setEditingId(comment.id); setEditText(comment.content) }} className="text-gray-400 p-1 active:scale-95 transition-transform" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(comment.id)} className="text-red-300 p-1 active:scale-95 transition-transform" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3 bg-white dark:bg-gray-900">
          <input
            ref={inputRef}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Escribí un comentario..."
            className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-2 text-sm outline-none border border-gray-200 dark:border-gray-600 focus:border-green-400 dark:text-white transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newComment.trim()}
            className="text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
            style={{ color: newComment.trim() && !sending ? 'rgb(34 197 94)' : 'rgb(156 163 175)' }}
          >
            {sending ? (
              <svg className="animate-spin w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CommentSheet
