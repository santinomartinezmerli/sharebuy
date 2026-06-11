import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ImageCarousel from '../components/ImageCarousel'
import Avatar from '../components/Avatar'

function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [reviews, setReviews] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const commentsEndRef = useRef(null)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const { data: postData } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .eq('id', postId)
        .single()

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      setPost(postData)
      setReviews(reviewsData ?? [])
      setComments(commentsData ?? [])
      setLoading(false)
    }
    fetch()
  }, [postId])

  const handleComment = async () => {
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
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    setSending(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('posts').delete().eq('id', postId)
    navigate('/profile', { replace: true })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
  )
  if (!post) return null

  const isOwner = currentUserId === post.user_id
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null
  const recommendedPct = reviews.length > 0
    ? Math.round((reviews.filter(r => r.recommended).length / reviews.length) * 100)
    : null

  const imageUrls = (post.image_urls && post.image_urls.length > 0)
    ? post.image_urls
    : (post.image_url ? [post.image_url] : [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">Publicación</span>
        {isOwner ? (
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/edit-post/${postId}`)} className="text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={() => setConfirmDelete(true)} className="text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="w-14" />
        )}
      </div>

      {/* Confirmación de borrado */}
      {confirmDelete && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700 font-medium">¿Eliminar publicación?</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500">Cancelar</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-medium text-red-600"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Imagen / Carousel */}
        {imageUrls.length > 0
          ? <ImageCarousel images={imageUrls} brand={post.brand} />
          : (
            <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
              <span className="text-7xl">🛍️</span>
              {post.brand && (
                <span className="absolute bottom-3 left-3 bg-white text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-100">
                  {post.brand}
                </span>
              )}
            </div>
          )
        }

        {/* Autor */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => navigate(`/user/${post.user_id}`)}
            className="flex items-center gap-3 flex-1"
          >
            <Avatar url={post.profiles?.avatar_url} username={post.profiles?.username} size="sm" />
            <span className="text-sm font-medium text-gray-900">{post.profiles?.username ?? 'usuario'}</span>
          </button>
          <span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString('es-AR')}</span>
        </div>

        {/* Info del producto */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-lg font-semibold text-gray-900">{post.product}</h1>
            {post.for_sale && (
              <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-full border border-green-200 flex-shrink-0 ml-2">
                En venta
              </span>
            )}
          </div>
          {post.caption && <p className="text-sm text-gray-500 mb-2">{post.caption}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            {post.price && <span className="text-green-500 font-medium text-sm">${post.price}</span>}
            {post.for_sale && post.sale_price && (
              <span className="text-orange-500 font-medium text-sm">Venta: ${post.sale_price}</span>
            )}
            {post.where_bought && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {post.where_bought}
              </span>
            )}
          </div>

          {isOwner && (
            <button
              onClick={async () => {
                const { data } = await supabase
                  .from('posts').update({ for_sale: !post.for_sale })
                  .eq('id', post.id).select().single()
                if (data) setPost(data)
              }}
              className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                post.for_sale ? 'border-red-200 text-red-500' : 'border-green-200 text-green-600'
              }`}
            >
              {post.for_sale ? 'Quitar de venta' : 'Poner en venta'}
            </button>
          )}

          {!isOwner && post.for_sale && (
            <button
              onClick={() => navigate(`/user/${post.user_id}`)}
              className="mt-3 w-full py-2.5 bg-green-500 text-white text-sm font-medium rounded-lg"
            >
              Contactar vendedor
            </button>
          )}
        </div>

        {/* Rating */}
        {reviews.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4">
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">{avgRating}</span>
            </div>
            <span className="text-xs text-gray-400">{reviews.length} reviews</span>
            {recommendedPct !== null && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                {recommendedPct}% lo recomiendan
              </span>
            )}
          </div>
        )}

        {/* Comentarios */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
            {comments.length === 0 ? 'Sin comentarios' : `${comments.length} comentarios`}
          </p>
          <div className="flex flex-col gap-3">
            {comments.map(comment => (
              <div key={comment.id} className="flex items-start gap-2">
                <button onClick={() => navigate(`/user/${comment.user_id}`)}>
                  <Avatar url={comment.profiles?.avatar_url} username={comment.profiles?.username} size="sm" />
                </button>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">{comment.profiles?.username} </span>
                  <span className="text-sm text-gray-600">{comment.content}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(comment.created_at).toLocaleDateString('es-AR')}</p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Reviews</p>
            <div className="flex flex-col gap-4">
              {reviews.map(review => (
                <div key={review.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Avatar url={review.profiles?.avatar_url} username={review.profiles?.username} size="sm" />
                    <span className="text-sm font-medium text-gray-900">{review.profiles?.username}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(review.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                  {review.content && <p className="text-sm text-gray-600 pl-9">{review.content}</p>}
                  {review.recommended !== null && (
                    <p className="text-xs pl-9">{review.recommended ? '👍 Lo recomienda' : '👎 No lo recomienda'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input comentario */}
      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3 bg-white">
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleComment()}
          placeholder="Escribí un comentario..."
          className="flex-1 bg-gray-50 rounded-full px-4 py-2 text-sm outline-none border border-gray-200 focus:border-green-400"
        />
        <button
          onClick={handleComment}
          disabled={sending || !newComment.trim()}
          className={`text-sm font-medium transition-colors ${newComment.trim() && !sending ? 'text-green-500' : 'text-gray-300'}`}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}

export default PostDetail
