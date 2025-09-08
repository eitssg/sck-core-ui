import { useEffect } from 'react'
import { useAppDispatch } from '@/store'
import { initializeAuth } from '@/store/slices/authSlice'

export default function AuthBootstrap() {
  const dispatch = useAppDispatch()
  useEffect(() => {
    // Hydrate auth state from localStorage on first load
    dispatch(initializeAuth())
  }, [dispatch])
  return null
}
