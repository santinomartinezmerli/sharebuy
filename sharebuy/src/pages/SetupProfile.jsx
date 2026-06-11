import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function SetupProfile() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [suggestedUsers, setSuggestedUsers] = useState([])
  const [following, setFollowing] = useState({})
  const [currentUserId, setCurrentUserId] = useState(null)
  const [step, setStep] = useState('profile')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileInputRef = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user.id)

      const emailPrefix = user.email?.split('@')[0] ?? ''
      setUsername(emailPrefix)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .limit(20)

      setSuggestedUsers((profiles ?? []).filter(p => p.id !== user.id))
    }
    fetchData()
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleSaveProfile = async () => {
    const trimmed = username.trim()
    if (!trimmed || trimmed.length < 3) {
      setError('El username debe tener al menos 3 caracteres')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Solo letras, números y guión bajo')
      return
    }

    setLoading(true)
    setError(null)

    let avatar = avatarUrl
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const filename = `avatar-${currentUserId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, avatarFile)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename)
        avatar = urlData.publicUrl
      }
    }

    const { error: updateError } = await supabase.from('profiles').upsert({
      id: currentUserId,
      username: trimmed,
      bio: bio.trim() || null,
      avatar_url: avatar || null,
      setup_complete: true
    })

    if (updateError) {
      setError('Error al guardar. Probá con otro username.')
      setLoading(false)
      return
    }

    setLoading(false)
    setStep('suggestions')
  }

  const handleFollow = async (targetId) => {
    if (following[targetId]) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetId)
      setFollowing(prev => ({ ...prev, [targetId]: false }))
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUserId, following_id: targetId
      })
      setFollowing(prev => ({ ...prev, [targetId]: true }))
    }
  }

  const handleFinish = () => {
    navigate('/feed', { replace: true })
  }

  if (step === 'suggestions') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">¡Listo, {username}!</h2>
          <p className="text-sm text-gray-400 mb-6 text-center">Seguí a algunos usuarios para empezar a ver contenido</p>

          {suggestedUsers.length === 0 ? (
            <p className="text-xs text-gray-400">No hay usuarios para sugerir</p>
          ) : (
            <div className="w-full max-w-sm space-y-2">
              {suggestedUsers.map(user => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3 border border-gray-100 dark:border-gray-700 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-medium overflow-hidden flex-shrink-0">
                    {user.avatar_url
                      ? <img src={user.avatar_url} className="w-full h-full object-cover" />
                      : user.username?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                  </div>
                  <button
                    onClick={() => handleFollow(user.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      following[user.id]
                        ? 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                        : 'bg-green-500 text-white'
                    }`}
                  >
                    {following[user.id] ? 'Siguiendo' : 'Seguir'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleFinish}
            className="mt-6 w-full max-w-sm py-3 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
          >
            Ir al feed
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Completá tu perfil</h1>
        <p className="text-sm text-gray-400 mb-8">Elegí cómo querés aparecer en ShareBuy</p>

        {error && (
          <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-medium overflow-hidden">
                {avatarPreview
                  ? <img src={avatarPreview} className="w-full h-full object-cover" />
                  : username.slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={() => document.getElementById('avatar-input')?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm shadow-md"
              >
                +
              </button>
              <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
            <span className="text-xs text-gray-400">Foto de perfil</span>
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Username *</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-green-400 bg-transparent"
              maxLength={30}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-medium mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Contá algo sobre vos..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-green-400 bg-transparent resize-none"
              maxLength={150}
            />
            <span className="text-[10px] text-gray-400">{bio.length}/150</span>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading || username.trim().length < 3}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
              !loading && username.trim().length >= 3
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {loading ? 'Guardando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SetupProfile