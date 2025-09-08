import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectIsAuthenticated } from '@/store/slices/authSlice'
import { selectUser as selectProfileUser, fetchUserProfile } from '@/store/slices/profileSlice'

export default function ProfileBootstrap() {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticated as any)
  const profileUser = useAppSelector(selectProfileUser as any)

  useEffect(() => {
    if (!isAuthenticated) return
    if (profileUser) return
    // Fetch current user's profile via /auth/v1/me
    dispatch(fetchUserProfile({}))
  }, [dispatch, isAuthenticated, profileUser])

  return null
}
