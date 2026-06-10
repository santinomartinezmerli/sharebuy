import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      const { data: postData } = await supabase
        .from('posts')
        .select('*, profiles(username)')
        .eq('id', postId)
        .single()

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles(username)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })

      setPost(postData)
      setReviews(reviewsData ?? [])
      setLoading(false)
    }

    fetchPost()
  }, [postId])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">
      Cargando...
    </div>
  )

  if (!post) return null

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const recommended = reviews.filter(r => r.recommended).length
  const recommendedPct = reviews.length > 0
    ? Math.round((recommended / reviews.length) * 100)
    : null

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">Producto</span>
        <div className="w-6" />
      </div>

      <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
        {post.image_url ? (
          <img src={post.image_url} className="w-full h-full object-cover" />
        ) : (
          <span className="text-7xl">🛍️</span>
        )}
        {post.brand && (
          <span className="absolute bottom-3 left-3 bg-white text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-100">
            {post.brand}
          </span>
        )}
      </div>

      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">{post.product}</h1>
        {post.caption && <p className="text-sm text-gray-500 mb-2">{post.caption}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          {post.price && (
            <span className="text-green-500 font-medium text-sm">${post.price}</span>
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
      </div>

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

      <div className="px-4 py-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
          {reviews.length === 0 ? 'Sin reviews todavía' : 'Reviews'}
        </p>
        <div className="flex flex-col gap-4">
          {reviews.map(review => (
            <div key={review.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-medium">
                  {review.profiles?.username?.slice(0, 2).toUpperCase()}
                </div>
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
    </div>
  )
}

export default PostDetail