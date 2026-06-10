import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function NewPost() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    product: '',
    brand: '',
    price: '',
    where: '',
    caption: ''
  })
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!form.product) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    let image_url = null

    if (image) {
      const ext = image.name.split('.').pop()
      const filename = `${user.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filename, image)

      if (uploadError) {
        console.error(uploadError)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filename)

      image_url = urlData.publicUrl
    }

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      product: form.product,
      brand: form.brand || null,
      price: form.price || null,
      where_bought: form.where || null,
      caption: form.caption || null,
      image_url,
      category: form.category || null,
    })

    setLoading(false)
    if (error) { console.error(error); return }
    navigate('/feed')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate('/feed')} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">Nueva compra</span>
        <button
          onClick={handleSubmit}
          disabled={loading || !form.product}
          className={`text-sm font-medium ${form.product && !loading ? 'text-green-500' : 'text-gray-300'}`}
        >
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        <label className="cursor-pointer">
          <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          {preview ? (
            <img src={preview} className="w-full aspect-square object-cover rounded-xl" />
          ) : (
            <div className="aspect-square bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">Subir foto</p>
            </div>
          )}
        </label>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">¿Qué compraste?</label>
          <input
            name="product"
            value={form.product}
            onChange={handleChange}
            placeholder="Nike Air Max 90"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Precio <span className="normal-case text-gray-300">· opcional</span></label>
            <input
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="$0"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Marca <span className="normal-case text-gray-300">· opcional</span></label>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              placeholder="Nike"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
            />
          </div>
        </div>

          <div className="flex flex-col gap-1">
  <label className="text-xs text-gray-400 uppercase tracking-wide">Categoría <span className="normal-case text-gray-300">· opcional</span></label>
  <div className="flex gap-2 flex-wrap">
    {['Ropa', 'Tecnología', 'Hogar', 'Deporte', 'Belleza'].map(cat => (
      <button
        key={cat}
        type="button"
        onClick={() => setForm({ ...form, category: form.category === cat ? '' : cat })}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          form.category === cat
            ? 'bg-green-500 text-white border-green-500'
            : 'border-gray-200 text-gray-500'
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
</div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">¿Dónde lo compraste? <span className="normal-case text-gray-300">· opcional</span></label>
          <input
            name="where"
            value={form.where}
            onChange={handleChange}
            placeholder="Mercado Libre, tienda, etc."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Contalo <span className="normal-case text-gray-300">· opcional</span></label>
          <textarea
            name="caption"
            value={form.caption}
            onChange={handleChange}
            placeholder="Ahorré meses para esto..."
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 bg-green-50 rounded-lg px-3 py-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-green-700">Te avisamos en 30 días para escribir una review</p>
        </div>

      </div>
    </div>
  )
}

export default NewPost