import { useThemeContext } from '@/components/ThemeContext'

export function useTheme() {
  const ctx = useThemeContext()

  return {
    isDark: ctx.isDark,
    theme: ctx.theme,
    themeConfig: ctx.themeConfig,
    availableThemes: ctx.availableThemes,
    setTheme: ctx.setTheme,
    
    // Convenience helpers using context
    toggleTheme: () => ctx.setTheme(ctx.resolvedTheme === 'dark' ? 'light' : 'dark'),
    updateSystemTheme: () => ctx.setTheme('system'),
  }
}
