import { useState, useRef, useCallback } from 'react'

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pullingRef = useRef(false)

  const THRESHOLD = 70
  const MAX_PULL = 100

  const handlers = {
    onTouchStart(e) {
      if (!pullingRef.current && window.scrollY === 0 && e.currentTarget.scrollTop === 0) {
        startY.current = e.touches[0].clientY
        pullingRef.current = true
      }
    },

    onTouchMove(e) {
      if (!pullingRef.current) return
      const diff = e.touches[0].clientY - startY.current
      if (diff > 0) {
        const distance = Math.min(diff * 0.4, MAX_PULL)
        setPullDistance(distance)
        setPulling(true)
      } else {
        setPulling(false)
        setPullDistance(0)
        pullingRef.current = false
      }
    },

    onTouchEnd() {
      if (pullingRef.current && pullDistance >= THRESHOLD) {
        onRefresh()
      }
      pullingRef.current = false
      setPulling(false)
      setPullDistance(0)
    },
  }

  return { pulling, pullDistance, THRESHOLD, handlers }
}

export function PullIndicator({ pulling, pullDistance, threshold }) {
  if (!pulling && pullDistance === 0) return null

  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      className="flex items-center justify-center h-0 overflow-visible transition-none"
      style={{ height: 0 }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          transform: `translateY(${Math.max(pullDistance - 20, 0)}px)`,
          opacity: Math.min(progress * 1.5, 1),
          transition: pullDistance === 0 ? 'opacity 0.2s, transform 0.2s' : 'none',
        }}
      >
        <svg
          className={`w-6 h-6 ${progress >= 1 ? 'text-green-500' : 'text-gray-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{
            transform: `rotate(${progress * 360}deg)`,
            transition: pullDistance === 0 ? 'transform 0.2s' : 'none',
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    </div>
  )
}
