import { NavLink } from 'react-router-dom'
import { useDarkMode } from '../lib/DarkModeContext'

function Layout({ children }) {
  const { dark, toggle } = useDarkMode()

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      <nav className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-around py-2">
          <NavLink to="/feed" className={({ isActive }) =>
            `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400'}`
          }>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </NavLink>

          <NavLink to="/explore" className={({ isActive }) =>
            `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400'}`
          }>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </NavLink>

          <NavLink to="/new" className="flex items-center justify-center w-12 h-12 bg-green-500 rounded-full text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </NavLink>

          <NavLink to="/messages" className={({ isActive }) =>
            `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400'}`
          }>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </NavLink>

          <NavLink to="/profile" className={({ isActive }) =>
            `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400'}`
          }>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </NavLink>
        </div>
      </nav>

      {/* Dark mode toggle flotante */}
      <button
        onClick={toggle}
        className="absolute bottom-20 right-2 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm shadow-md"
        title={dark ? 'Modo claro' : 'Modo oscuro'}
      >
        {dark ? '☀️' : '🌙'}
      </button>
    </div>
  )
}

export default Layout
