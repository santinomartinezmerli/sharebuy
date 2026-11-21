import { useQuery } from '@tanstack/react-query'
import { fetchProfileSummary } from '../services/profiles'
import { profileKey } from '../lib/profileCache'

// Profile header: { profile, followersCount, followingCount, following, blocked }.
// `following` and `blocked` are only meaningful when viewerId is someone else.
// Cached for 60s, so going back to a profile you just saw costs no request and shows
// instantly; older data is shown first and refreshed in the background.
export function useProfile(profileId, viewerId) {
  return useQuery({
    queryKey: profileKey(profileId, viewerId),
    queryFn: async () => {
      try {
        return await fetchProfileSummary(profileId, viewerId)
      } catch (err) {
        console.error('Profile request failed:', err)
        throw err
      }
    },
    enabled: !!profileId && !!viewerId,
    staleTime: 60_000,
  })
}
