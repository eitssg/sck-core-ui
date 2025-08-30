import { useAppSelector, useAppDispatch } from '@/store'
import { selectUser, selectUserTheme, updateUserTheme, setLocalTheme } from '@/store/slices/profileSlice'
import { themes } from '@/lib/themes'

export const useTheme = () => {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const currentTheme = useAppSelector(selectUserTheme)

  // Get theme configuration
  const themeConfig = currentTheme && themes[currentTheme] ? themes[currentTheme] : null
  const isDark = themeConfig?.isDark || 
    (currentTheme === 'dark') || 
    (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  // Set theme function
  const setTheme = async (newTheme: string) => {
    if (user) {
      // User is logged in - update via API
      dispatch(updateUserTheme(newTheme))
    } else {
      // Guest user - just update local state (for login pages)
      dispatch(setLocalTheme(newTheme))
    }
  }

  return {
    theme: currentTheme,
    themeConfig,
    isDark,
    availableThemes: Object.values(themes),
    setTheme,
    isAuthenticated: !!user,
  }
}
