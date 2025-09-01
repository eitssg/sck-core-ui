import { useEffect } from "react"
import { themes } from "@/lib/themes"

interface ThemeProviderProps {
  children: React.ReactNode
  theme?: string
}

export function ThemeProvider({ children, theme = "system" }: ThemeProviderProps) {
  // Apply theme to DOM - NO REDUX HOOKS HERE
  const applyTheme = (themeId: string) => {
    const root = window.document.documentElement

    // Remove all theme classes
    root.classList.remove("light", "dark")

    // System theme
    if (themeId === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      return
    }

    // Basic themes
    if (themeId === "light" || themeId === "dark") {
      root.classList.add(themeId)
      return
    }

    // Custom theme
    const customTheme = themes[themeId]
    if (customTheme) {
      // Apply custom CSS variables
      Object.entries(customTheme.colors).forEach(([property, value]) => {
        root.style.setProperty(property, value)
      })
      root.classList.add(customTheme.isDark ? "dark" : "light")
    } else {
      // Fallback to system theme
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
    }
  }

  // Apply theme when theme prop changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return <>{children}</>
}
