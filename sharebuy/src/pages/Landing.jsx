import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Landing() {
  const [showLogin, setShowLogin] = useState(false)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email o contraseña incorrectos')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError('No se pudo crear la cuenta')
      else setSuccess('Revisá tu email para confirmar tu cuenta')
    }

    setLoading(false)
  }

  if (showLogin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 w-full max-w-sm flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              share<span className="text-green-500">buy</span>
            </h1>
            <p className="text-sm text-gray-400">Mostrá lo que comprás</p>
            <div className="w-12 h-0.5 bg-green-500 rounded mt-1"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700"></div>
            <span className="text-xs text-gray-400">o</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700"></div>
          </div>

          {error && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          {success && (
            <div className="w-full bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">{success}</div>
          )}

          <div className="w-full flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-green-400 bg-transparent"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-green-400 bg-transparent"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                email && password && !loading
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Registrarse'}
            </button>
          </div>

          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setSuccess(null) }}
            className="text-xs text-gray-400"
          >
            {mode === 'login'
              ? <>¿No tenés cuenta? <span className="text-green-500 font-medium">Registrate</span></>
              : <>¿Ya tenés cuenta? <span className="text-green-500 font-medium">Iniciá sesión</span></>
            }
          </button>

          <button onClick={() => setShowLogin(false)} className="text-xs text-gray-400">
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-2">
          share<span className="text-green-500">buy</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8">Mostrá lo que comprás</p>

        <div className="w-16 h-1 bg-green-500 rounded mb-8" />

        <div className="max-w-xs space-y-4 text-left">
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-lg flex-shrink-0">📸</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Compartí tus compras</p>
              <p className="text-xs text-gray-400">Subí fotos de lo que compraste y opiná</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-lg flex-shrink-0">🔍</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Descubrí productos</p>
              <p className="text-xs text-gray-400">Explorá reseñas de gente real</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-500 text-lg flex-shrink-0">💬</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Conectá</p>
              <p className="text-xs text-gray-400">Chateá y seguí a otros compradores</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowLogin(true)}
          className="mt-10 w-full max-w-xs py-3 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
        >
          Comenzar
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-300 pb-4">© 2026 ShareBuy</p>
    </div>
  )
}

export default Landing