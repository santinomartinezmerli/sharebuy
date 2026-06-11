import { useState } from 'react'

function ImageCarousel({ images, brand, className = '' }) {
  const [current, setCurrent] = useState(0)

  const urls = images && images.length > 0 ? images : []

  if (urls.length === 0) return null

  const prev = (e) => {
    e.stopPropagation()
    setCurrent(c => Math.max(0, c - 1))
  }
  const next = (e) => {
    e.stopPropagation()
    setCurrent(c => Math.min(urls.length - 1, c + 1))
  }

  return (
    <div className={`relative aspect-square bg-gray-50 overflow-hidden ${className}`}>
      <img src={urls[current]} className="w-full h-full object-cover" alt="" />

      {urls.length > 1 && current > 0 && (
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/30 rounded-full text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {urls.length > 1 && current < urls.length - 1 && (
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/30 rounded-full text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {urls.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}

      {urls.length > 1 && (
        <span className="absolute top-2 right-2 text-[10px] text-white bg-black/30 rounded-full px-1.5 py-0.5 leading-none">
          {current + 1}/{urls.length}
        </span>
      )}

      {brand && (
        <span className={`absolute ${urls.length > 1 ? 'bottom-7' : 'bottom-3'} left-3 bg-white text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-100`}>
          {brand}
        </span>
      )}
    </div>
  )
}

export default ImageCarousel
