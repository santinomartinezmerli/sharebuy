import { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useDarkMode } from '../lib/DarkModeContext'
import { usePullToRefresh, PullIndicator } from '../hooks/usePullToRefresh'
import { useNavDirection } from '../hooks/useNavDirection'
import { useUser } from '../lib/UserContext.jsx'

function Layout({ children }) {
  const location = useLocation()
  const { pulling, pullDistance, THRESHOLD } = usePullToRefresh(() => {
    const fn = window.__ptrRefresh
    if (fn) { fn().catch?.(e => console.error('PTR error:', e)) } else { window.location.reload() }
  })
  const { dark, toggle } = useDarkMode()
  const { user } = useUser()
  const direction = useNavDirection()
  const scrollMap = useRef({})
  const prevPathRef = useRef(location.pathname)
  const mainRef = useRef(null)

  useEffect(() => {
    if (mainRef.current) {
      scrollMap.current[prevPathRef.current] = mainRef.current.scrollTop
    }
    if (scrollMap.current[location.pathname] !== undefined && mainRef.current) {
      mainRef.current.scrollTop = scrollMap.current[location.pathname]
    }
    prevPathRef.current = location.pathname
  }, [location.pathname])

  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnread = useCallback(async () => {
    if (!user) return

    const { data: convs } = await supabase.from('conversations').select('id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    const convIds = convs?.map(c => c.id) ?? []
    if (convIds.length === 0) { setUnreadCount(0); return }

    const { data: allMsgs } = await supabase.from('messages')
      .select('id, conversation_id, sender_id, created_at')
      .in('conversation_id', convIds)
      .not('sender_id', 'eq', user.id)
      .order('created_at', { ascending: false }).limit(500)

    const lastRead = JSON.parse(localStorage.getItem('chatLastRead') || '{}')
    let count = 0
    for (const msg of allMsgs ?? []) {
      const lastReadAt = lastRead[msg.conversation_id]
      if (!lastReadAt || new Date(msg.created_at).getTime() > lastReadAt) count++
    }
    setUnreadCount(count)
  }, [user])

  // Re-fetch unread count on every navigation (so badge updates after viewing a chat)
  useEffect(() => { fetchUnread() }, [location, fetchUnread])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('unread-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_id !== user.id) {
          const lr = JSON.parse(localStorage.getItem('chatLastRead') || '{}')
          const lastReadAt = lr[payload.new.conversation_id]
          if (!lastReadAt || new Date(payload.new.created_at).getTime() > lastReadAt) {
            setUnreadCount(prev => prev + 1)
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-hidden">
      <main ref={mainRef} className={`flex-1 ${location.pathname.startsWith('/messages/') ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'} overscroll-contain pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] relative`}>
        <PullIndicator pulling={pulling} pullDistance={pullDistance} threshold={THRESHOLD} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
            style={{ overflow: location.pathname.startsWith('/messages/') ? 'hidden' : undefined }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="px-3 pb-3 pt-1.5">
          <nav className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center justify-around py-1 relative">
              <NavLink to="/feed" className={({ isActive }) =>
                `flex flex-col items-center p-2 transition-all duration-200 ${isActive ? 'text-green-500 scale-110' : 'text-gray-400 dark:text-gray-500'}`
              } children={({ isActive }) => (<>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {isActive && <motion.div layoutId="nav-dot" className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-green-500" />}
              </>)} />

              <NavLink to="/explore" className={({ isActive }) =>
                `flex flex-col items-center p-2 transition-all duration-200 ${isActive ? 'text-green-500 scale-110' : 'text-gray-400 dark:text-gray-500'}`
              } children={({ isActive }) => (<>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {isActive && <motion.div layoutId="nav-dot" className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-green-500" />}
              </>)} />

              <NavLink to="/new" className="flex items-center justify-center w-11 h-11 bg-green-500 rounded-full text-white shadow-md shadow-green-500/20 -mt-1 transition-all duration-200 hover:bg-green-600 hover:shadow-lg active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </NavLink>

              <NavLink to="/messages" className={({ isActive }) =>
                `flex flex-col items-center p-2 transition-all duration-200 ${isActive ? 'text-green-500 scale-110' : 'text-gray-400 dark:text-gray-500'}`
              } children={({ isActive }) => (<>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                {isActive && <motion.div layoutId="nav-dot" className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-green-500" />}
              </>)} />

              <NavLink to="/profile" className={({ isActive }) =>
                `flex flex-col items-center p-2 transition-all duration-200 ${isActive ? 'text-green-500 scale-110' : 'text-gray-400 dark:text-gray-500'}`
              } children={({ isActive }) => (<>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {isActive && <motion.div layoutId="nav-dot" className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-green-500" />}
              </>)} />
            </div>
          </nav>
        </div>
      </div>

      <button
        onClick={toggle}
        className="fixed bottom-28 right-4 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shadow-lg border border-gray-300 dark:border-gray-600 hover:scale-110 transition-all duration-200 active:scale-95"
        title={dark ? 'Modo claro' : 'Modo oscuro'}
      >
        {dark ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default Layout
