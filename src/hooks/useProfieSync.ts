import { useEffect } from 'react'
import { useAuth } from '@/contexts/useAuth'
import { useAppDispatch } from '@/store'
import { clearProfile } from '@/store/slices/profileSlice'

export const useProfileSync = () => {
  const { user } = useAuth()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (user) {
      // Sync user data to Redux profile slice
      dispatch({
        type: 'profile/syncFromAuth',
        payload: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            theme: user.theme || 'system',
            role: user.role,
          },
          loading: false,
          error: null,
        }
      })
    } else {
      // Clear Redux profile when user logs out
      dispatch(clearProfile())
    }
  }, [user, dispatch])

  return { user }
}
