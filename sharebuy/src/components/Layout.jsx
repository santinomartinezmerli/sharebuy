import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDarkMode } from '../lib/DarkModeContext'

function Layout({ children }) {
  const { dark, toggle } = useDarkMode()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let channel
    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .not('sender_id', 'eq', user.id)
        .is('read_at', null)
        .in('conversation_id', (
          await supabase.from('conversations').select('id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        ).data?.map(c => c.id) ?? [])
      setUnreadCount(count ?? 0)

      channel = supabase.channel('unread-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          if (payload.new.sender_id !== user.id) {
            setUnreadCount(prev => prev + 1)
          }
        })
        .subscribe()
    }
    fetchUnread()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-hidden">
      <main className="flex-1 overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {children}
      </main>

      <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <div className="px-3 pb-3 pt-1.5">
          <nav className="rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100/50 dark:border-gray-700/50 shadow-lg">
            <div className="flex items-center justify-around py-1">
              <NavLink to="/feed" className={({ isActive }) =>
                `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`
              }>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </NavLink>

              <NavLink to="/explore" className={({ isActive }) =>
                `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`
              }>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </NavLink>

              <NavLink to="/new" className="flex items-center justify-center w-11 h-11 bg-green-500 rounded-full text-white shadow-md shadow-green-500/20 -mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </NavLink>

              <NavLink to="/messages" className={({ isActive }) =>
                `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`
              }>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </NavLink>

              <NavLink to="/profile" className={({ isActive }) =>
                `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`
              }>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </NavLink>
            </div>
          </nav>
        </div>
      </div>

      <button
        onClick={toggle}
        className="fixed bottom-28 right-4 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shadow-lg border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
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
