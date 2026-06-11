import { useState, useEffect, useRef } from 'react'

function StoryViewer({ groups, groupIndex, onClose, onGroupChange }) {
  const stories = groups[groupIndex].stories
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  const timerRef = useRef(null)
  const touchStartTime = useRef(0)
  const currentRef = useRef(current)
  const isNavigatingBack = useRef(false)
  currentRef.current = current

  // Cross-fade state
  const [prevStory, setPrevStory] = useState(null)
  const [fadePhase, setFadePhase] = useState(0)
  // 0 = idle, 1 = preparing (both images rendered), 2 = transitioning

  const goNext = () => {
    if (current < stories.length - 1) {
      transitionTo(current + 1)
    } else if (groupIndex < groups.length - 1) {
      onGroupChange(groupIndex + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    if (current > 0) {
      transitionTo(current - 1)
    } else if (groupIndex > 0) {
      isNavigatingBack.current = true
      onGroupChange(groupIndex - 1)
    }
  }

  const transitionTo = (index) => {
    if (fadePhase !== 0 || index === current) return
    const prev = stories[current]
    setPrevStory(prev)
    setCurrent(index)
    setFadePhase(1)

    setTimeout(() => {
      setFadePhase(2)
      setTimeout(() => {
        setPrevStory(null)
        setFadePhase(0)
      }, 250)
    }, 20)
  }

  useEffect(() => {
    setCurrent(0)
    setProgress(0)
  }, [groupIndex])

  useEffect(() => {
    if (isNavigatingBack.current) {
      isNavigatingBack.current = false
      setCurrent(stories.length - 1)
    }
  })

  useEffect(() => {
    setProgress(0)
  }, [current])

  useEffect(() => {
    if (paused) return

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentRef.current < stories.length - 1) {
            setCurrent(c => c + 1)
          } else if (groupIndex < groups.length - 1) {
            onGroupChange(groupIndex + 1)
          } else {
            onClose()
          }
          return 0
        }
        return prev + 1
      })
    }, 50)

    return () => clearInterval(timerRef.current)
  }, [paused, current, groupIndex])

  const handleTouchStart = (e) => {
    e.stopPropagation()
    touchStartTime.current = Date.now()
    setPaused(true)
  }

  const handleTouchMove = (e) => {
    e.stopPropagation()
  }

  const handleTouchEnd = (e) => {
    e.stopPropagation()
    const duration = Date.now() - touchStartTime.current
    setPaused(false)

    if (duration >= 200) return

    const x = e.changedTouches[0].clientX
    const screenWidth = window.innerWidth
    const zone = x / screenWidth

    if (zone < 0.3) {
      goPrev()
    } else if (zone > 0.7) {
      goNext()
    }
  }

  const handleMouseDown = () => {
    touchStartTime.current = Date.now()
    setPaused(true)
  }

  const handleMouseUp = (e) => {
    const duration = Date.now() - touchStartTime.current
    setPaused(false)

    if (duration >= 200) return

    const x = e.clientX
    const screenWidth = window.innerWidth
    const zone = x / screenWidth

    if (zone < 0.3) {
      goPrev()
    } else if (zone > 0.7) {
      goNext()
    }
  }

  const story = stories[current]
  if (!story) return null

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="relative w-full max-w-md h-full flex flex-col overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20 pointer-events-none">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white"
                style={{
                  width: i < current ? '100%' : i === current ? `${progress}%` : '0%',
                  transition: 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div
          className={`absolute top-7 left-3 right-3 flex items-center justify-between z-20 pointer-events-none transition-opacity duration-200 ${paused ? 'opacity-50' : 'opacity-100'}`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
              {story.profiles?.avatar_url ? (
                <img src={story.profiles.avatar_url} className="w-full h-full object-cover" draggable={false} />
              ) : (
                story.profiles?.username?.slice(0, 2).toUpperCase()
              )}
            </div>
            <span className="text-white text-sm font-medium drop-shadow-sm">{story.profiles?.username}</span>
          </div>
          <button onClick={onClose} className="text-white pointer-events-auto p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Story content with cross-fade */}
        <div className="flex-1 relative bg-gray-900">
          {/* New image layer */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              opacity: fadePhase === 2 ? 1 : fadePhase === 0 ? 1 : 0,
              transition: fadePhase === 2 ? 'opacity 0.2s ease-in-out' : 'none',
            }}
          >
            {story.image_url ? (
              <img
                src={story.image_url}
                className="w-full h-full object-contain"
                draggable={false}
                style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
              />
            ) : (
              <span className="text-8xl pointer-events-none select-none">{story.emoji ?? '🛍️'}</span>
            )}
          </div>

          {/* Previous image fading out */}
          {prevStory && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                opacity: fadePhase === 2 ? 0 : 1,
                transition: fadePhase === 2 ? 'opacity 0.2s ease-in-out' : 'none',
              }}
            >
              {prevStory.image_url ? (
                <img
                  src={prevStory.image_url}
                  className="w-full h-full object-contain"
                  draggable={false}
                  style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                />
              ) : (
                <span className="text-8xl pointer-events-none select-none">{prevStory.emoji ?? '🛍️'}</span>
              )}
            </div>
          )}

          {/* Hold overlay */}
          <div
            className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-200 ${paused ? 'opacity-20' : 'opacity-0'}`}
          />
        </div>

        {/* Bottom info */}
        <div
          className={`absolute bottom-6 left-3 right-3 text-white pointer-events-none transition-opacity duration-200 ${paused ? 'opacity-50' : 'opacity-100'}`}
        >
          <p className="text-sm font-medium drop-shadow-sm">{story.product}</p>
          {story.caption && <p className="text-xs text-white/80 mt-1 drop-shadow-sm">{story.caption}</p>}
          {story.price && <p className="text-green-300 text-xs mt-1 drop-shadow-sm">${story.price}</p>}
        </div>
      </div>
    </div>
  )
}

export default StoryViewer
