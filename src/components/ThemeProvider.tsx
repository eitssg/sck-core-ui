import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getThemeById, getThemesList } from "@/lib/themes";
import { ThemeName, ThemeContext, ThemeContextValue } from './ThemeContext'



type ThemeProviderProps = {
  children: React.ReactNode;
  theme?: ThemeName;                   // comes from Redux/profile
  onThemeChange?: (t: ThemeName) => void; // called when user selects a theme
  // Optional per-mode presets (ids from lib/themes.ts)
  lightPresetId?: string | null;
  darkPresetId?: string | null;
};

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeProvider({ children, theme = "system", onThemeChange, lightPresetId, darkPresetId }: ThemeProviderProps) {
  const sys = getSystemTheme();
  const [current, setCurrent] = useState<ThemeName>(theme);
  const sysRef = useRef(sys);

  // Keep internal state in sync with prop changes
  useEffect(() => setCurrent(theme), [theme]);

  // Watch system changes if using "system"
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      sysRef.current = mq.matches ? "dark" : "light";
      // Re-apply DOM class if current is "system"
      if (current === "system") applyDomTheme("system", sysRef.current);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [current]);

  const resolved: "light" | "dark" = current === "system" ? sysRef.current : (current as any) === "dark" ? "dark" : "light";

  // Apply theme to <html> element (class + data attribute + CSS vars from preset)
  const applyDomTheme = useCallback((sel: ThemeName, res: "light" | "dark") => {
    const root = document.documentElement;
    root.classList.toggle("dark", res === "dark");

    // Determine preset by resolved mode
    const presetId = res === 'dark' ? (darkPresetId || null) : (lightPresetId || null);
    const preset = presetId ? getThemeById(presetId) : null;

    // Set data-theme primarily for debugging/inspection
    const dataTheme = preset?.name || (typeof sel === "string" ? sel : res);
    root.setAttribute("data-theme", dataTheme);

    // Apply preset HSL variables when available
    if (preset && preset.colors) {
      Object.entries(preset.colors).forEach(([k, v]) => {
        try { root.style.setProperty(k, v); } catch { /* ignore */ }
      });
    }
  }, [lightPresetId, darkPresetId]);
  useEffect(() => {
    applyDomTheme(current, resolved);
  }, [current, resolved, applyDomTheme]);

  const setTheme = (t: ThemeName) => {
    setCurrent(t);
    onThemeChange?.(t);
  };

  const allThemes = useMemo(() => getThemesList(), []);
  const themeConfig = useMemo(() => allThemes.find((t: any) => t.name === current), [allThemes, current]);

  const value: ThemeContextValue = {
    theme: current,
    resolvedTheme: resolved,
    setTheme,
    availableThemes: allThemes,
    themeConfig,
    isDark: resolved === "dark",
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

