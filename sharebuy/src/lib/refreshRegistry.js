let currentRefresh = null

export function registerRefresh(fn) {
  currentRefresh = fn
  window.__ptrRefresh = fn
  return () => {
    if (currentRefresh === fn) currentRefresh = null
    if (window.__ptrRefresh === fn) window.__ptrRefresh = null
  }
}

export function getRefresh() {
  return currentRefresh || window.__ptrRefresh || null
}
