import { createContext, useContext } from "react";

type ThemeName = string; // "system" | "light" | "dark" | custom names


type ThemeContextValue = {
  theme: ThemeName;                    // current selection ("system"/"light"/"dark"/custom)
  resolvedTheme: "light" | "dark";     // after applying system preference
  setTheme: (t: ThemeName) => void;    // setter (delegates to parent via onThemeChange)
  availableThemes: any[];
  themeConfig?: any;
  isDark: boolean;
};


export const ThemeContext = createContext<ThemeContextValue | null>(null);
export type { ThemeName, ThemeContextValue };


export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}