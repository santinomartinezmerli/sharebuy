import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: posts } = await supabase
        .from('posts')
        .select('id, product, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (posts) {
        const reviewNotifications = posts
          .map(post => {
            const created = new Date(post.created_at)
            const now = new Date()
            const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24))

            if (diffDays >= 0) {
              return {
                id: post.id,
                type: 'review',
                product: post.product,
                days: diffDays,
                created_at: post.created_at
              }
            }
            return null
          })
          .filter(Boolean)

        setNotifications(reviewNotifications)
      }

      setLoading(false)
    }

    fetchNotifications()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">
      Cargando...
    </div>
  )

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="text-base font-semibold text-gray-900">Notificaciones</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm">Sin notificaciones por ahora</p>
          <p className="text-xs text-center px-8">Te avisamos cuando puedas escribir una review de tus compras</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {notifications.map(notif => (
            <div key={notif.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 bg-purple-50">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">Ya pasaron {notif.days} días</span> desde que compraste{' '}
                  <span className="font-medium">{notif.product}</span>. ¿Qué te pareció?
                </p>
                <button
  onClick={() => navigate(`/review/${notif.id}`)}
  className="mt-2 text-xs font-medium text-purple-500 border border-purple-200 rounded-full px-3 py-1"
>
  Escribir review
</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications