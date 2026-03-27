import { readonly, shallowRef } from 'vue'

export const uiThemeValues = ['system', 'light', 'dark'] as const

export type UiTheme = (typeof uiThemeValues)[number]

const defaultUiTheme: UiTheme = 'system'
const uiThemeStorageKey = 'ui_theme'
const uiThemeCookieName = 'ui_theme'
const uiThemeDatasetName = 'theme'
const uiThemePreference = shallowRef<UiTheme>(defaultUiTheme)

export function initializeUiTheme() {
  const theme = readStoredUiTheme()
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

  document.documentElement.dataset[uiThemeDatasetName] = theme
}

export function updateUiTheme(theme: UiTheme) {
  uiThemePreference.value = theme
  applyUiTheme(theme)
  persistUiTheme(theme)
}

function persistUiTheme(theme: UiTheme) {
  persistUiThemeCookie(theme)
  persistUiThemeStorage(theme)
}

function readStoredUiTheme() {
  const storedTheme = readUiThemeStorage()
  if (storedTheme !== null) {
    return storedTheme
  }

  return readUiThemeCookie()
}

function readUiThemeStorage(): UiTheme | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const theme = window.localStorage.getItem(uiThemeStorageKey)
    return theme && isUiTheme(theme) ? theme : null
  } catch {
    return null
  }
}

function persistUiThemeCookie(theme: UiTheme) {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${uiThemeCookieName}=${encodeURIComponent(theme)}; Path=/; Max-Age=31536000; SameSite=Lax`
}

function persistUiThemeStorage(theme: UiTheme) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(uiThemeStorageKey, theme)
  } catch {}
}

function isUiTheme(value: string): value is UiTheme {
  return (uiThemeValues as readonly string[]).includes(value)
}
