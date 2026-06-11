let currentRefresh = null

export function registerRefresh(fn) {
  currentRefresh = fn
  return () => { if (currentRefresh === fn) currentRefresh = null }
}

export function getRefresh() {
  return currentRefresh
}
