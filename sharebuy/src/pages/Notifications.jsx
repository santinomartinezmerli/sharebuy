import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: myPosts } = await supabase
        .from('posts')
        .select('id, product, created_at')
        .eq('user_id', user.id)

      const myPostIds = myPosts?.map(p => p.id) ?? []
      const postMap = Object.fromEntries((myPosts ?? []).map(p => [p.id, p]))

      const allNotifs = []

      // Follows
      const { data: followsData } = await supabase
        .from('follows')
        .select('id, follower_id, created_at')
        .eq('following_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (followsData && followsData.length > 0) {
        const followerIds = [...new Set(followsData.map(f => f.follower_id))]
        const { data: followerProfiles } = await supabase
          .from('profiles').select('id, username').in('id', followerIds)
        const profileMap = Object.fromEntries((followerProfiles ?? []).map(p => [p.id, p]))
        followsData.forEach(f => {
          allNotifs.push({
            id: `follow-${f.id}`, type: 'follow',
            username: profileMap[f.follower_id]?.username ?? 'alguien',
            user_id: f.follower_id, created_at: f.created_at,
          })
        })
      }

      // Likes
      if (myPostIds.length > 0) {
        const { data: likesData } = await supabase
          .from('likes').select('id, post_id, user_id, created_at')
          .in('post_id', myPostIds).neq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(30)

        if (likesData && likesData.length > 0) {
          const likerIds = [...new Set(likesData.map(l => l.user_id))]
          const { data: likerProfiles } = await supabase
            .from('profiles').select('id, username').in('id', likerIds)
          const profileMap = Object.fromEntries((likerProfiles ?? []).map(p => [p.id, p]))
          likesData.forEach(l => {
            allNotifs.push({
              id: `like-${l.id}`, type: 'like',
              username: profileMap[l.user_id]?.username ?? 'alguien',
              user_id: l.user_id, post_id: l.post_id,
              product: postMap[l.post_id]?.product, created_at: l.created_at,
            })
          })
        }
      }

      // Comments
      if (myPostIds.length > 0) {
        const { data: commentsData } = await supabase
          .from('comments').select('id, post_id, user_id, content, created_at')
          .in('post_id', myPostIds).neq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(30)

        if (commentsData && commentsData.length > 0) {
          const commenterIds = [...new Set(commentsData.map(c => c.user_id))]
          const { data: commenterProfiles } = await supabase
            .from('profiles').select('id, username').in('id', commenterIds)
          const profileMap = Object.fromEntries((commenterProfiles ?? []).map(p => [p.id, p]))
          commentsData.forEach(c => {
            allNotifs.push({
              id: `comment-${c.id}`, type: 'comment',
              username: profileMap[c.user_id]?.username ?? 'alguien',
              user_id: c.user_id, post_id: c.post_id,
              product: postMap[c.post_id]?.product,
              preview: c.content, created_at: c.created_at,
            })
          })
        }
      }

      // Reviews
      const reviewNotifs = (myPosts ?? [])
        .map(post => {
          const diffDays = Math.floor((Date.now() - new Date(post.created_at)) / (1000 * 60 * 60 * 24))
          if (diffDays >= 7) {
            return { id: `review-${post.id}`, type: 'review', product: post.product, days: diffDays, post_id: post.id, created_at: post.created_at }
          }
          return null
        })
        .filter(Boolean)

      allNotifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setNotifications([...allNotifs, ...reviewNotifs])
      setLoading(false)

      // Real-time subscription
      const channel = supabase.channel('notifications-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` },
          async (payload) => {
            const { data: profile } = await supabase
              .from('profiles').select('username').eq('id', payload.new.follower_id).single()
            setNotifications(prev => [{
              id: `follow-${payload.new.id}`, type: 'follow',
              username: profile?.username ?? 'alguien',
              user_id: payload.new.follower_id,
              created_at: payload.new.created_at,
            }, ...prev.filter(n => !n.id.startsWith('review-'))])
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    fetchNotifications()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
  )

  return (
    <div className="flex flex-col dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-base font-semibold text-gray-900">Notificaciones</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm">Sin notificaciones por ahora</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {notifications.map(notif => {
            if (notif.type === 'follow') {
              return (
                <button key={notif.id} onClick={() => navigate(`/user/${notif.user_id}`)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900"><span className="font-medium">{notif.username}</span> empezó a seguirte</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(notif.created_at)}</span>
                </button>
              )
            }
            if (notif.type === 'like') {
              return (
                <button key={notif.id} onClick={() => navigate(`/post/${notif.post_id}`)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{notif.username}</span> le dio like a tu publicación
                      {notif.product && <span className="text-gray-500"> · {notif.product}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(notif.created_at)}</span>
                </button>
              )
            }
            if (notif.type === 'comment') {
              return (
                <button key={notif.id} onClick={() => navigate(`/post/${notif.post_id}`)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{notif.username}</span> comentó tu publicación
                      {notif.product && <span className="text-gray-500"> · {notif.product}</span>}
                    </p>
                    {notif.preview && <p className="text-xs text-gray-400 truncate mt-0.5">{notif.preview}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(notif.created_at)}</span>
                </button>
              )
            }
            if (notif.type === 'review') {
              return (
                <div key={notif.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-purple-50 dark:bg-purple-900/20">
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
                    <button onClick={() => navigate(`/review/${notif.post_id}`)}
                      className="mt-2 text-xs font-medium text-purple-500 border border-purple-200 rounded-full px-3 py-1">
                      Escribir review
                    </button>
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}

export default Notifications
