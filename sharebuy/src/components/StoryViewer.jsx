import { useState, useEffect, useRef } from 'react'

function StoryViewer({ groups, groupIndex, onClose, onGroupChange }) {
  const stories = groups[groupIndex].stories
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const [closing, setClosing] = useState(false)
  const [swipeDownY, setSwipeDownY] = useState(0)
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)

  const containerRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const gestureRef = useRef(null)
  const isNavigatingBack = useRef(false)
  const currentRef = useRef(current)
  currentRef.current = current

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
    const interval = setInterval(() => {
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
        return prev + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [current, groupIndex])

  useEffect(() => {
    if (closing) {
      requestAnimationFrame(() => {
        setSwipeDownY(window.innerHeight * 0.8)
      })
      const timer = setTimeout(() => onClose(), 300)
      return () => clearTimeout(timer)
    }
  }, [closing])

  const story = stories[current]

  const goNext = () => {
    if (current < stories.length - 1) {
      setCurrent(c => c + 1)
    } else if (groupIndex < groups.length - 1) {
      onGroupChange(groupIndex + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    if (current > 0) {
      setCurrent(c => c - 1)
    } else if (groupIndex > 0) {
      isNavigatingBack.current = true
      onGroupChange(groupIndex - 1)
    }
  }

  const handleClose = () => {
    setClosing(true)
    setSwiping(false)
  }

  const processGestureEnd = (clientX, clientY) => {
    if (gestureRef.current === 'down') {
      if (swipeDownY > 100) {
        handleClose()
        return true
      }
    } else if (gestureRef.current === 'horizontal') {
      if (swipeX < -60) {
        if (groupIndex < groups.length - 1) onGroupChange(groupIndex + 1)
      } else if (swipeX > 60) {
        if (groupIndex > 0) {
          isNavigatingBack.current = true
          onGroupChange(groupIndex - 1)
        }
      }
    } else {
      const w = containerRef.current?.clientWidth || 1
      if (clientX < w / 3) {
        goPrev()
      } else if (clientX > (w * 2) / 3) {
        goNext()
      }
    }
    return false
  }

  const resetGesture = () => {
    setSwipeDownY(0)
    setSwipeX(0)
    setSwiping(false)
    gestureRef.current = null
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    gestureRef.current = null
  }

  const handleTouchMove = (e) => {
    if (closing) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    if (!gestureRef.current) {
      if (dy > 20 && dy > Math.abs(dx)) {
        gestureRef.current = 'down'
      } else if (Math.abs(dx) > 20) {
        gestureRef.current = 'horizontal'
      }
    }

    if (gestureRef.current === 'down') {
      setSwipeDownY(dy)
      setSwiping(true)
    } else if (gestureRef.current === 'horizontal') {
      setSwipeX(dx)
      setSwiping(true)
    }
  }

  const handleTouchEnd = (e) => {
    const isClosing = processGestureEnd(
      e.changedTouches[0].clientX,
      e.changedTouches[0].clientY
    )
    if (!isClosing) resetGesture()
  }

  const handleMouseDown = (e) => {
    touchStartX.current = e.clientX
    touchStartY.current = e.clientY
    gestureRef.current = null
  }

  const handleMouseMove = (e) => {
    if (!gestureRef.current) return
    if (closing) return
    const dx = e.clientX - touchStartX.current
    const dy = e.clientY - touchStartY.current

    if (!gestureRef.current) {
      if (dy > 20 && dy > Math.abs(dx)) {
        gestureRef.current = 'down'
      } else if (Math.abs(dx) > 20) {
        gestureRef.current = 'horizontal'
      }
    }

    if (gestureRef.current === 'down') {
      setSwipeDownY(dy)
      setSwiping(true)
    } else if (gestureRef.current === 'horizontal') {
      setSwipeX(dx)
      setSwiping(true)
    }
  }

  const handleMouseUp = (e) => {
    const isClosing = processGestureEnd(e.clientX, e.clientY)
    if (!isClosing) resetGesture()
  }

  const bgOpacity = Math.max(0, closing ? 0 : 1 - swipeDownY / 400)
  const contentOpacity = Math.max(0, closing ? 0 : 1 - swipeDownY / 500)
  const isFirstUser = groupIndex === 0
  const isLastUser = groupIndex === groups.length - 1

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center select-none"
      style={{ backgroundColor: `rgba(0,0,0,${bgOpacity})` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { if (gestureRef.current) resetGesture() }}
    >
      <div
        className="relative w-full max-w-md h-full flex flex-col overflow-hidden"
        style={{
          transform: `translateY(${swipeDownY}px) translateX(${swipeX}px)`,
          opacity: contentOpacity,
          transition: closing
            ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease-out'
            : swiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
              {story.profiles?.avatar_url ? (
                <img src={story.profiles.avatar_url} className="w-full h-full object-cover" />
              ) : (
                story.profiles?.username?.slice(0, 2).toUpperCase()
              )}
            </div>
            <span className="text-white text-sm font-medium">{story.profiles?.username}</span>
          </div>
          <button onClick={handleClose} className="text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center bg-gray-900 relative">
          {story.image_url ? (
            <img src={story.image_url} className="w-full h-full object-contain" draggable={false} />
          ) : (
            <span className="text-8xl">{story.emoji ?? '🛍️'}</span>
          )}
        </div>

        {swipeX !== 0 && (
          <div className="absolute inset-y-0 flex items-center pointer-events-none z-20">
            {swipeX > 0 && !isFirstUser && (
              <div className="bg-white/10 backdrop-blur-sm rounded-r-xl px-2 py-12 ml-1">
                <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-6 left-3 right-3 text-white pointer-events-none">
          <p className="text-sm font-medium">{story.product}</p>
          {story.caption && <p className="text-xs text-white/80 mt-1">{story.caption}</p>}
          {story.price && <p className="text-green-300 text-xs mt-1">${story.price}</p>}
        </div>
      </div>
    </div>
  )
}

export default StoryViewer
