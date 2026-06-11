import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SkeletonForm } from '../components/Skeleton'

function EditProfile() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', bio: '' })
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('id', user.id)
        .single()

      if (data) {
        setForm({ username: data.username ?? '', bio: data.bio ?? '' })
        setAvatarUrl(data.avatar_url ?? null)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setRemoveAvatar(false)
  }

  const handleRemoveAvatar = () => {
    setRemoveAvatar(true)
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const handleSave = async () => {
    if (!form.username.trim()) return
    setSaving(true)
    setError(null)

    let newAvatarUrl = removeAvatar ? null : avatarUrl

    if (avatarFile && !removeAvatar) {
      const ext = avatarFile.name.split('.').pop()
      const filename = `avatar-${userId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, avatarFile, { upsert: true })

      if (uploadError) {
        setError(`Error al subir: ${uploadError.message}`)
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename)
      newAvatarUrl = urlData.publicUrl
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: form.username.trim(),
        bio: form.bio.trim(),
        avatar_url: newAvatarUrl
      })

    setSaving(false)

    if (updateError) {
      if (updateError.code === '23505') {
        setError('Ese username ya está en uso')
      } else {
        setError(`Error al guardar: ${updateError.message}`)
      }
      return
    }

    navigate('/profile')
  }

  if (loading) return <SkeletonForm fields={2} />

  const displayAvatar = avatarPreview || (removeAvatar ? null : avatarUrl)

  return (
    <div className="flex flex-col h-full dark:bg-gray-900 dark:text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">Editar perfil</span>
        <button
          onClick={handleSave}
          disabled={saving || !form.username.trim()}
          className={`text-sm font-medium ${form.username.trim() && !saving ? 'text-green-500' : 'text-gray-300'}`}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 mb-2">
          <label className="cursor-pointer relative">
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-medium overflow-hidden border-2 border-gray-200">
              {displayAvatar
                ? <img src={displayAvatar} className="w-full h-full object-cover" />
                : form.username?.slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </label>
          <p className="text-xs text-gray-400">Tocar para cambiar foto</p>
          {avatarUrl && !removeAvatar && (
            <button onClick={handleRemoveAvatar} className="text-xs text-red-500 font-medium">
              Quitar foto
            </button>
          )}
          {removeAvatar && (
            <button onClick={() => setRemoveAvatar(false)} className="text-xs text-gray-500 font-medium">
              Cancelar
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Username</label>
          <input
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="tu.username"
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-green-400 bg-transparent transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Bio <span className="normal-case text-gray-300">· opcional</span></label>
          <textarea
            value={form.bio}
            onChange={e => setForm({ ...form, bio: e.target.value })}
            placeholder="Contá algo sobre vos..."
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:border-green-400 bg-transparent transition-colors resize-none"
          />
        </div>

      </div>
    </div>
  )
}

export default EditProfile
