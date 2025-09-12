import React, { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ThemeProvider from '@/components/ThemeProvider'
import type { RootState, AppDispatch } from '@/store'
import { updateUserTheme, setLocalTheme } from '@/store/slices/profileSlice'

export default function AppTheme({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>() // typed dispatch fixes thunk error

  // Prefer user profile theme from current user; fallback to theme slice; else 'system'
  const profileUser = useSelector((s: RootState) => (s as any)?.profile?.user) as any
  const sliceTheme = useSelector((s: RootState) => (s as any)?.theme?.current) as string | null

  const effective = (profileUser?.theme as string | null) ?? sliceTheme ?? 'system'

  // Per-mode theme presets from profile preferences
  const { lightPresetId, darkPresetId } = useMemo(() => {
    const prefs = (profileUser?.preferences || {}) as Record<string, any>
    const ui = (prefs.ui || {}) as Record<string, any>
    return {
      lightPresetId: (ui.lightThemeId as string) || null,
      darkPresetId: (ui.darkThemeId as string) || null,
    }
  }, [profileUser])

  return (
    <ThemeProvider
      theme={effective}
      lightPresetId={lightPresetId}
      darkPresetId={darkPresetId}
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