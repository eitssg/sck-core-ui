import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { themes, type ThemeConfig } from '@/lib/themes'
import type { Theme } from '@/lib/theme-types'

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
  if (theme === 'system') {
    return getSystemIsDark()
  }
  if (theme === 'dark') {
    return true
  }
  if (theme === 'light') {
    return false
  }
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
      
      // Update theme config
      if (newTheme === 'system' || newTheme === 'light' || newTheme === 'dark') {
        state.themeConfig = null
      } else {
        state.themeConfig = themes[newTheme] || null
      }
      
      // Update isDark
      state.isDark = determineIsDark(newTheme, state.themeConfig)
      
      // Persist to localStorage
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
    }
  },
})

export const { setTheme, initializeTheme, updateSystemTheme } = themeSlice.actions
export default themeSlice.reducer
