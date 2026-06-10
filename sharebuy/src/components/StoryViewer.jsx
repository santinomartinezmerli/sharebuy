import { useState, useEffect } from 'react'

function StoryViewer({ stories, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (current < stories.length - 1) {
            setCurrent(c => c + 1)
          } else {
            onClose()
          }
          return 0
        }
        return prev + 2
      })
    }, 100)

    return () => clearInterval(interval)
  }, [current])

  const story = stories[current]

  const goNext = () => {
    if (current < stories.length - 1) setCurrent(c => c + 1)
    else onClose()
  }

  const goPrev = () => {
    if (current > 0) setCurrent(c => c - 1)
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md h-full flex flex-col">

        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
              {story.profiles?.username?.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-white text-sm font-medium">{story.profiles?.username}</span>
          </div>
          <button onClick={onClose} className="text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center bg-gray-900 relative">
          {story.image_url ? (
            <img src={story.image_url} className="w-full h-full object-contain" />
          ) : (
            <span className="text-8xl">{story.emoji ?? '🛍️'}</span>
          )}

          <button onClick={goPrev} className="absolute left-0 top-0 w-1/3 h-full" />
          <button onClick={goNext} className="absolute right-0 top-0 w-1/3 h-full" />
        </div>

        <div className="absolute bottom-6 left-3 right-3 text-white">
          <p className="text-sm font-medium">{story.product}</p>
          {story.caption && <p className="text-xs text-white/80 mt-1">{story.caption}</p>}
          {story.price && <p className="text-green-300 text-xs mt-1">${story.price}</p>}
        </div>

      </div>
    </div>
  )
}

export default StoryViewer