import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectIsAuthenticated } from '@/store/slices/authSlice'
import { selectUser as selectProfileUser, fetchUserProfile, fetchAuthProfiles, fetchAuthProfile, selectUserProfiles } from '@/store/slices/profileSlice'

export default function ProfileBootstrap() {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticated as any)
  const profileUser = useAppSelector(selectProfileUser as any)
  const profiles = useAppSelector(selectUserProfiles as any) as any[]

  useEffect(() => {
    if (!isAuthenticated) return
    let stored: string | null = null
    try { stored = localStorage.getItem('sck.profileName'); } catch { /* ignore */ }
    // Fallback to 'default' when not stored
    const desired = stored || 'default'

    // If we have a stored profile and no user loaded, hydrate that profile directly
    if (desired && !profileUser) {
      dispatch(fetchAuthProfile({ profileName: desired, force: true }) as any)
        .unwrap()
        .catch(() => {
          // Fallback to legacy /auth/v1/me for default
          dispatch(fetchUserProfile({}) as any)
        })
    } else if (!profileUser) {
      dispatch(fetchUserProfile({}) as any)
    }
    // Fetch list (TTL guarded) after attempting specific profile
    if (!profiles || profiles.length === 0) {
      dispatch(fetchAuthProfiles({ force: false }) as any)
    }
  }, [dispatch, isAuthenticated, profileUser, profiles])

  return null
}
