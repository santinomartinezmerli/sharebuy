import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/UserContext.jsx'

function Review() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { userId } = useUser()
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [recommended, setRecommended] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!rating || !userId) return
    setLoading(true)

    const { error } = await supabase.from('reviews').insert({
      post_id: postId,
      user_id: userId,
      rating,
      content: content || null,
      recommended,
    })

    setLoading(false)
    if (error) { console.error(error); return }
    navigate('/feed')
  }

  return (
    <div className="flex flex-col h-full dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">Tu review</span>
        <button
          onClick={handleSubmit}
          disabled={loading || !rating}
          className={`text-sm font-medium ${rating && !loading ? 'text-green-500' : 'text-gray-300'}`}
        >
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">¿Cómo lo calificarías?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-8 h-8 transition-colors ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">¿Qué te pareció? <span className="normal-case text-gray-300">· opcional</span></p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Contá tu experiencia con el producto..."
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-green-400 bg-transparent transition-colors resize-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">¿Lo recomendarías?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setRecommended(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${
                recommended === true
                  ? 'bg-green-50 border-green-400 text-green-700'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              👍 Sí
            </button>
            <button
              onClick={() => setRecommended(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${
                recommended === false
                  ? 'bg-red-50 border-red-300 text-red-600'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              👎 No
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-purple-50 rounded-lg px-3 py-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-purple-700">Te avisamos en 5 meses para una review final</p>
        </div>

      </div>
    </div>
  )
}

export default Review