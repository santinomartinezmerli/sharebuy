import { useEffect, useState, useRef } from 'react'

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pullingRef = useRef(false)
  const distanceRef = useRef(0)
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  const THRESHOLD = 60
  const MAX_PULL = 100

  useEffect(() => {
    const getScrollTop = () => {
      const main = document.querySelector('main')
      if (main) return main.scrollTop
      return document.documentElement.scrollTop || window.scrollY
    }

    const onTouchStart = (e) => {
      if (!pullingRef.current && getScrollTop() === 0) {
        startY.current = e.touches[0].clientY
        pullingRef.current = true
      }
    }

    const onTouchMove = (e) => {
      if (!pullingRef.current) return
      const diff = e.touches[0].clientY - startY.current
      if (diff > 0) {
        const dist = Math.min(diff * 0.4, MAX_PULL)
        if (dist > distanceRef.current) distanceRef.current = dist
        setPullDistance(dist)
        setPulling(true)
      } else {
        setPullDistance(0)
        setPulling(false)
      }
    }

    const onTouchEnd = () => {
      if (pullingRef.current && distanceRef.current >= THRESHOLD) {
        window.dispatchEvent(new CustomEvent('ptr-refresh'))
        const fn = window.__ptrRefresh
        if (fn) { try { fn() } catch (e) {} }
      }
      pullingRef.current = false
      setPulling(false)
      setPullDistance(0)
      distanceRef.current = 0
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return { pulling, pullDistance, THRESHOLD }
}

export function PullIndicator({ pulling, pullDistance, threshold }) {
  if (!pulling && pullDistance === 0) return null

  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div className="flex items-center justify-center h-0 overflow-visible" style={{ height: 0 }}>
      <div
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700"
        style={{
          transform: `translateY(${Math.max(pullDistance - 18, 0)}px)`,
          opacity: Math.min(progress * 1.5, 1),
          transition: pullDistance === 0 ? 'opacity 0.2s, transform 0.2s' : 'none',
        }}
      >
        <svg
          className={`w-5 h-5 ${progress >= 1 ? 'text-green-500' : 'text-gray-400'}`}
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
