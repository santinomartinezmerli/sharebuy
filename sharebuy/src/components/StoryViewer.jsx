import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function StoryViewer({ storyGroups, activeGroupIndex, onClose, onNextGroup, onPrevGroup }) {
  const navigate = useNavigate()
  const group = storyGroups[activeGroupIndex]
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    setCurrent(0)
    setProgress(0)
  }, [group.userId])

  useEffect(() => {
    if (paused) return
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNext()
          return 0
        }
        return p + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [paused, current, group.userId])

  const goNext = () => {
    if (current < group.stories.length - 1) {
      setCurrent(c => c + 1)
      setProgress(0)
    } else {
      onNextGroup()
    }
  }

  const goPrev = () => {
    if (current > 0) {
      setCurrent(c => c - 1)
      setProgress(0)
    } else {
      onPrevGroup()
    }
  }

  const handleClick = (e) => {
    const x = e.clientX
    const zone = x / window.innerWidth
    if (zone < 0.3) goPrev()
    else if (zone > 0.7) goNext()
  }

  const story = group.stories[current]

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center select-none">
      <div className="relative w-full max-w-md h-full overflow-hidden">

        <div className="absolute top-3 left-3 right-3 flex gap-1 z-30">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white"
                style={{
                  width: i < current ? '100%' : i === current ? `${progress}%` : '0%',
                  transition: i === current ? 'none' : undefined
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-30">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/user/${group.userId}`)
            }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
              {group.username?.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-white text-sm font-medium drop-shadow">{group.username}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose() }} className="text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-900"
          onClick={handleClick}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {story.image_url ? (
            <img
              src={story.image_url}
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            />
          ) : (
            <span className="text-8xl pointer-events-none">{story.emoji ?? '🛍️'}</span>
          )}
        </div>

        <div className="absolute bottom-6 left-3 right-3 text-white pointer-events-none z-20">
          <p className="text-sm font-medium drop-shadow">{story.product}</p>
          {story.caption && <p className="text-xs text-white/80 mt-1 drop-shadow">{story.caption}</p>}
          {story.price && <p className="text-green-300 text-xs mt-1 drop-shadow">${story.price}</p>}
        </div>

      </div>
    </div>
  )
}

export default StoryViewer
