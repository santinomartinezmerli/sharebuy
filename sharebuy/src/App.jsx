import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (!session) return <Login />

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          share<span className="text-green-500">buy</span>
        </h1>
        <p className="text-gray-500">Bienvenido, {session.user.email}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-red-400 hover:text-red-500"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default App