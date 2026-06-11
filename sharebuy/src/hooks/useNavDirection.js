import { useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function useNavDirection() {
  const location = useLocation()
  const prevRef = useRef({ pathname: location.pathname, depth: location.pathname.split('/').filter(Boolean).length })
  const dirRef = useRef(1)

  const depth = location.pathname.split('/').filter(Boolean).length

  if (location.pathname !== prevRef.current.pathname) {
    if (depth > prevRef.current.depth) {
      dirRef.current = 1
    } else if (depth < prevRef.current.depth) {
      dirRef.current = -1
    }
    prevRef.current = { pathname: location.pathname, depth }
  }

  return dirRef.current
}
