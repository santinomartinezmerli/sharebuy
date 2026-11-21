import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../lib/UserContext.jsx'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { motion } from 'framer-motion'
import { useConversations } from '../hooks/useConversations'

function Messages() {
  const navigate = useNavigate()
  const { userId } = useUser()
  const sentinelRef = useRef(null)

  // 20 conversations per page, most recently active first. Pull-to-refresh and the refetch when
  // the tab becomes visible again live in useConversations.
  const { conversations, loading, loadingMore, hasMore, loadMore } = useConversations(userId)

  // Infinite scroll: same observer as the feed.
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadMore()
      }
    }, { threshold: 0.1 })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [loadMore, hasMore, loadingMore])

  if (loading) return <SkeletonList count={6} />

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
            const other = conv.other_user
            return (
              <motion.button
                key={conv.id} whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:bg-gray-100 dark:active:bg-gray-700"
              >
                <Avatar url={other?.avatar_url} username={other?.username} size="lg" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{other?.username}</p>
                    {conv.unread_count > 0 && (
                      <span className="flex-shrink-0 bg-green-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {conv.last_message.sender_id === userId
                        ? '✓ Enviado'
                        : /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(conv.last_message.content)
                          ? '📷 Foto'
                          : conv.last_message.content}
                    </p>
                  )}
                </div>
              </motion.button>
            )
          })}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="py-4 text-center text-xs text-gray-400">Cargando más...</div>
          )}
        </div>
      )}
    </div>
  )
}

export default Messages
