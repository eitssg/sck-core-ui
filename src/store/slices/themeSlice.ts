import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { themes, type ThemeConfig } from '@/lib/themes'
import type { Theme } from '@/lib/theme-types'
import type { RootState } from '@/store'

interface ThemeState {
  currentTheme: Theme
  themeConfig: ThemeConfig | null
  isDark: boolean
  availableThemes: ThemeConfig[]
}

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('ui-theme') as Theme) || 'system'
  }
  return 'system'
}

const getSystemIsDark = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

const determineIsDark = (theme: Theme, themeConfig: ThemeConfig | null): boolean => {
  if (theme === 'system') return getSystemIsDark()
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return themeConfig?.isDark || false
}

const initialState: ThemeState = {
  currentTheme: getInitialTheme(),
  themeConfig: null,
  isDark: false,
  availableThemes: Object.values(themes),
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      const newTheme = action.payload
      state.currentTheme = newTheme

      if (newTheme === 'system' || newTheme === 'light' || newTheme === 'dark') {
        state.themeConfig = null
      } else {
        state.themeConfig = themes[newTheme] || null
      }

      state.isDark = determineIsDark(newTheme, state.themeConfig)

      if (typeof window !== 'undefined') {
        localStorage.setItem('ui-theme', newTheme)
      }
    },

    initializeTheme: (state) => {
      const theme = state.currentTheme
      state.isDark = determineIsDark(theme, state.themeConfig)

      if (theme !== 'system' && theme !== 'light' && theme !== 'dark') {
        state.themeConfig = themes[theme] || null
      }
    },

    updateSystemTheme: (state) => {
      if (state.currentTheme === 'system') {
        state.isDark = getSystemIsDark()
      }
    },

    // Minimal toggle to switch between light/dark (when system/custom is set, flip based on current darkness)
    toggleTheme: (state) => {
      const cur = state.currentTheme
      let next: Theme
      if (cur === 'dark') next = 'light'
      else if (cur === 'light') next = 'dark'
      else if (cur === 'system') next = getSystemIsDark() ? 'light' : 'dark'
      else next = state.themeConfig?.isDark ? 'light' : 'dark'

      state.currentTheme = next
      state.themeConfig = null
      state.isDark = determineIsDark(next, null)

      if (typeof window !== 'undefined') {
        localStorage.setItem('ui-theme', next)
      }
    },
  },
})

export const { setTheme, initializeTheme, updateSystemTheme, toggleTheme } = themeSlice.actions

// Selectors
export const selectThemeState = (state: RootState) => state.theme
export const selectThemeName = (state: RootState) => state.theme.currentTheme
export const selectIsDark = (state: RootState) => state.theme.isDark
export const selectThemeConfig = (state: RootState) => state.theme.themeConfig
export const selectAvailableThemes = (state: RootState) => state.theme.availableThemes

export default themeSlice.reducer
