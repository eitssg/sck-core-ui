import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ThemeProvider from '@/components/ThemeProvider'
import type { RootState, AppDispatch } from '@/store'
import { updateUserTheme, setLocalTheme } from '@/store/slices/profileSlice'

export default function AppTheme({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>() // typed dispatch fixes thunk error

  // Prefer user profile theme; fallback to theme slice; else 'system'
  const profileTheme = useSelector((s: RootState) => (s as any)?.profile?.theme) as string | null
  const profileDataTheme = useSelector((s: RootState) => (s as any)?.profile?.data?.theme) as string | null
  const sliceTheme = useSelector((s: RootState) => (s as any)?.theme?.current) as string | null

  const effective = profileTheme ?? profileDataTheme ?? sliceTheme ?? 'system'

  return (
    <ThemeProvider
      theme={effective}
      onThemeChange={(t) => {
        // UI theme slice (plain action)
        dispatch({ type: 'theme/setTheme', payload: t })
        // Local profile theme for immediate precedence
        dispatch(setLocalTheme(t))
        // Persist to server (async thunk)
        dispatch(updateUserTheme({ theme: t }))
      }}
    >
      {children}
    </ThemeProvider>
  )
}