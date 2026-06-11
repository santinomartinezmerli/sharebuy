import { useState, useRef, useCallback } from 'react'

function ImageCarousel({ images, brand, className = '' }) {
  const [current, setCurrent] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef(null)
  const startXRef = useRef(0)
  const currentRef = useRef(0)

  const urls = images && images.length > 0 ? images : []

  if (urls.length === 0) return null

  const goTo = useCallback((index) => {
    setCurrent(index)
    currentRef.current = index
  }, [])

  const prev = (e) => {
    e.stopPropagation()
    goTo(Math.max(0, current - 1))
  }

  const next = (e) => {
    e.stopPropagation()
    goTo(Math.min(urls.length - 1, current + 1))
  }

  const goToDot = (i, e) => {
    e.stopPropagation()
    goTo(i)
  }

  const getContainerWidth = () =>
    containerRef.current?.clientWidth || 1

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX
    setDragging(true)
    setDragX(0)
  }

  const handleTouchMove = (e) => {
    if (!dragging) return
    const delta = e.touches[0].clientX - startXRef.current
    setDragX(delta)
  }

  const handleTouchEnd = () => {
    if (!dragging) return
    setDragging(false)
    const containerWidth = getContainerWidth()
    const threshold = containerWidth * 0.25

    if (dragX < -threshold && currentRef.current < urls.length - 1) {
      goTo(currentRef.current + 1)
    } else if (dragX > threshold && currentRef.current > 0) {
      goTo(currentRef.current - 1)
    }
    setDragX(0)
  }

  const handleMouseDown = (e) => {
    startXRef.current = e.clientX
    setDragging(true)
    setDragX(0)
    e.preventDefault()
  }

  const handleMouseMove = (e) => {
    if (!dragging) return
    const delta = e.clientX - startXRef.current
    setDragX(delta)
  }

  const handleMouseUp = () => {
    if (!dragging) return
    handleTouchEnd()
  }

  const handleMouseLeave = () => {
    if (dragging) handleTouchEnd()
  }

  // Calculate drag offset as percentage of container width
  const dragOffsetPct = dragging
    ? (dragX / getContainerWidth()) * 100
    : 0

  // Apply resistance at edges (first or last image)
  const isAtStart = current === 0 && dragX > 0
  const isAtEnd = current === urls.length - 1 && dragX < 0
  const effectiveOffset = (isAtStart || isAtEnd) ? dragOffsetPct * 0.25 : dragOffsetPct

  const translateX = `${(-current * 100) + effectiveOffset}%`

  const transitionClass = dragging ? '' : 'transition-transform duration-300 ease-out'

  return (
    <div
      ref={containerRef}
      className={`relative aspect-square bg-gray-50 overflow-hidden select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`flex h-full ${transitionClass}`}
        style={{ transform: `translateX(${translateX})` }}
      >
        {urls.map((url, i) => (
          <div key={i} className="min-w-full h-full flex-shrink-0">
            <img src={url} className="w-full h-full object-cover pointer-events-none" alt="" draggable={false} />
          </div>
        ))}
      </div>

      {urls.length > 1 && current > 0 && (
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/30 rounded-full text-white active:scale-90 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {urls.length > 1 && current < urls.length - 1 && (
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/30 rounded-full text-white active:scale-90 transition-transform"
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
              onClick={(e) => goToDot(i, e)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === current ? 'bg-white w-3' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}

      {urls.length > 1 && (
        <span className="absolute top-2 right-2 text-[10px] text-white bg-black/30 rounded-full px-1.5 py-0.5 leading-none pointer-events-none">
          {current + 1}/{urls.length}
        </span>
      )}

      {brand && (
        <span className={`absolute ${urls.length > 1 ? 'bottom-7' : 'bottom-3'} left-3 bg-white text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-100 pointer-events-none`}>
          {brand}
        </span>
      )}
    </div>
  )
}

export default ImageCarousel
