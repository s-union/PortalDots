import { afterEach, describe, expect, it } from 'vitest'
import { initializeUiTheme, readUiThemeCookie, updateUiTheme } from './theme'

describe('theme', () => {
  afterEach(() => {
    window.localStorage.removeItem('ui_theme')
    document.cookie = 'ui_theme=; Path=/; Max-Age=0; SameSite=Lax'
    document.documentElement.removeAttribute('data-theme')
  })

  it('uses localStorage before cookie when initializing the theme', () => {
    window.localStorage.setItem('ui_theme', 'dark')
    document.cookie = 'ui_theme=light; Path=/; SameSite=Lax'

    expect(initializeUiTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('falls back to cookie when localStorage does not have a saved theme', () => {
    document.cookie = 'ui_theme=light; Path=/; SameSite=Lax'

    expect(initializeUiTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('stores the selected theme in both localStorage and cookie', () => {
    updateUiTheme('dark')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('ui_theme')).toBe('dark')
    expect(document.cookie).toContain('ui_theme=dark')
  })

  it('returns system when the cookie value is invalid', () => {
    expect(readUiThemeCookie('ui_theme=invalid')).toBe('system')
  })
})
