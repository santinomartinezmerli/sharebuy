import { supabase } from '../lib/supabase'

function Login() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 w-full max-w-sm flex flex-col items-center gap-6">
        
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            share<span className="text-green-500">buy</span>
          </h1>
          <p className="text-sm text-gray-400">Mostrá lo que comprás</p>
          <div className="w-12 h-0.5 bg-green-500 rounded mt-1"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
          Continuar con Google
        </button>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-gray-100"></div>
          <span className="text-xs text-gray-400">o</span>
          <div className="flex-1 h-px bg-gray-100"></div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
          />
          <button className="w-full py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
            Entrar
          </button>
        </div>

        <p className="text-xs text-gray-400">
          ¿No tenés cuenta?{' '}
          <span className="text-green-500 font-medium cursor-pointer">Registrate</span>
        </p>

      </div>
    </div>
  )
}

export default Login