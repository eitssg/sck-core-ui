export type Theme = "dark" | "light" | "system" | string

export type ThemeConfig = {
  name: string;
  displayName: string;
  description: string;
  colors: Record<string, string>;
  isDark: boolean;
}

export type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export type ThemeProviderState = {
  theme: Theme
  themeConfig: ThemeConfig | null
  setTheme: (theme: Theme) => void
  availableThemes: ThemeConfig[]
  isDark: boolean
}

export const initialThemeState: ThemeProviderState = {
  theme: "system",
  themeConfig: null,
  setTheme: () => null,
  availableThemes: [],
  isDark: false,
}
