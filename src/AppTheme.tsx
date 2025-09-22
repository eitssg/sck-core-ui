import React, { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ThemeProvider from '@/components/ThemeProvider'
import type { RootState, AppDispatch } from '@/store'
import { setTheme as setThemeAction } from '@/store/slices/themeSlice'
import { patchAuthProfile, updateProfileGlobally } from '@/store/slices/profileSlice'

export default function AppTheme({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>() // typed dispatch fixes thunk error

  // Prefer user profile theme from current user; fallback to theme slice; else 'system'
  const profileUser = useSelector((s: RootState) => (s as any)?.profile?.user) as any
  // Use the Redux theme slice (persists to localStorage under 'ui-theme')
  const sliceTheme = useSelector((s: RootState) => (s as any)?.theme?.currentTheme) as string | null

  // 1) Use server-stored preference if present: profile.preferences.ui.theme
  // 2) Fallback to legacy profile.theme
  // 3) Then local Redux slice stored value
  const effective = (() => {
    const prefs = (profileUser?.preferences || {}) as Record<string, any>
    const ui = (prefs.ui || {}) as Record<string, any>
    return (ui.theme as string | null) ?? (profileUser?.theme as string | null) ?? sliceTheme ?? 'system'
  })()

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
      onThemeChange={async (t) => {
        // Persist to Redux + localStorage immediately
        dispatch(setThemeAction(t as any))

        // Build updated preferences
        const currentPrefs = ((profileUser?.preferences as any) || {}) as Record<string, any>
        const nextPrefs = {
          ...currentPrefs,
          ui: { ...(currentPrefs.ui || {}), theme: t },
        }

        const profileName = (profileUser?.profile_name as string) || 'default'
  // Optimistically update local profile cache for snappy UI (preferences only)
  dispatch(updateProfileGlobally({ profile_name: profileName, preferences: nextPrefs } as any))

        // Persist to server profile.preferences
        try {
          await (dispatch(patchAuthProfile({ profileName, profileData: { preferences: nextPrefs } }) as any) as any).unwrap()
        } catch {
          // swallow errors; local preference and Redux still reflect the choice
        }
      }}
    >
      {children}
    </ThemeProvider>
  )
}