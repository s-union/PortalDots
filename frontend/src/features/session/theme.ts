import { readonly, shallowRef } from 'vue'

export const uiThemeValues = ['system', 'light', 'dark'] as const

export type UiTheme = (typeof uiThemeValues)[number]

const defaultUiTheme: UiTheme = 'system'
const uiThemeCookieName = 'ui_theme'
const uiThemeClassPrefix = 'theme-'
const uiThemePreference = shallowRef<UiTheme>(defaultUiTheme)

export function initializeUiTheme() {
  const theme = readUiThemeCookie()
  uiThemePreference.value = theme
  applyUiTheme(theme)
  return theme
}

export function useUiThemePreference() {
  return {
    theme: readonly(uiThemePreference),
    setTheme: updateUiTheme
  }
}

export function readUiThemeCookie(cookie = typeof document === 'undefined' ? '' : document.cookie) {
  const matched = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${uiThemeCookieName}=`))

  if (!matched) {
    return defaultUiTheme
  }

  const value = decodeURIComponent(matched.slice(uiThemeCookieName.length + 1))
  return isUiTheme(value) ? value : defaultUiTheme
}

export function applyUiTheme(theme: UiTheme) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  for (const value of uiThemeValues) {
    root.classList.remove(`${uiThemeClassPrefix}${value}`)
  }
  root.classList.add(`${uiThemeClassPrefix}${theme}`)
}

export function updateUiTheme(theme: UiTheme) {
  uiThemePreference.value = theme
  applyUiTheme(theme)
  persistUiTheme(theme)
}

function persistUiTheme(theme: UiTheme) {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${uiThemeCookieName}=${encodeURIComponent(theme)}; Path=/; Max-Age=31536000; SameSite=Lax`
}

function isUiTheme(value: string): value is UiTheme {
  return (uiThemeValues as readonly string[]).includes(value)
}
