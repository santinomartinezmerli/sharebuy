import { useState, useEffect } from 'react'

// Returns `value`, but only after it has stopped changing for `delay` ms.
// Used so a server-side filter does not fire one request per keystroke.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
