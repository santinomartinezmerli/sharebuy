import { NavLink } from 'react-router-dom'

function Layout({ children }) {
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white">
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      <nav className="border-t border-gray-100 bg-white">
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

          <NavLink to="/notifications" className={({ isActive }) =>
            `flex flex-col items-center p-2 ${isActive ? 'text-green-500' : 'text-gray-400'}`
          }>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
    </div>
  )
}

export default Layout