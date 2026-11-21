import { QueryClient } from '@tanstack/react-query'

// One shared cache for the whole app.
//  - staleTime: data younger than 30s is served from cache without refetching.
//  - retry: one retry for transient network errors, then surface the error.
//  - refetchOnWindowFocus off: this is a mobile-first PWA and focus events fire often
//    (switching apps, pull-to-refresh). Queries that must be fresh on every visit,
//    like the feed, opt in with refetchOnMount: 'always'.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
