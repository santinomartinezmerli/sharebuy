import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ImageCarousel from '../components/ImageCarousel'

function EditPost() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageUrls, setImageUrls] = useState([])
  const [form, setForm] = useState({
    product: '',
    brand: '',
    price: '',
    where: '',
    caption: '',
    category: '',
  })

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (data) {
        setForm({
          product: data.product ?? '',
          brand: data.brand ?? '',
          price: data.price ?? '',
          where: data.where_bought ?? '',
          caption: data.caption ?? '',
          category: data.category ?? '',
        })
        const imgs = (data.image_urls && data.image_urls.length > 0)
          ? data.image_urls
          : (data.image_url ? [data.image_url] : [])
        setImageUrls(imgs)
      }
      setLoading(false)
    }
    fetch()
  }, [postId])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    if (!form.product.trim()) return
    setSaving(true)

    const { error } = await supabase
      .from('posts')
      .update({
        product: form.product.trim(),
        brand: form.brand.trim() || null,
        price: form.price.trim() || null,
        where_bought: form.where.trim() || null,
        caption: form.caption.trim() || null,
        category: form.category || null,
      })
      .eq('id', postId)

    setSaving(false)
    if (error) { console.error(error); return }
    navigate(`/post/${postId}`, { replace: true })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">Cargando...</div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">Editar publicación</span>
        <button
          onClick={handleSave}
          disabled={saving || !form.product.trim()}
          className={`text-sm font-medium ${form.product.trim() && !saving ? 'text-green-500' : 'text-gray-300'}`}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Preview de fotos (solo lectura) */}
        {imageUrls.length > 0 && (
          <div className="rounded-xl overflow-hidden">
            <ImageCarousel images={imageUrls} />
          </div>
        )}

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

      </div>
    </div>
  )
}

export default EditPost
