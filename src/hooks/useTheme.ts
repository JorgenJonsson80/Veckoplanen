import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const THEME_KEY = 'veckoplanen_theme'

function readStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme)

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function setTheme(next: ThemePreference) {
    if (next === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
  }

  return { theme, setTheme }
}
