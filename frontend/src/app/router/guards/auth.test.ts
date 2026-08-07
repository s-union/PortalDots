import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'
import { buildCircleSelectorLocation } from '@/app/router/circleSelectorRedirect'
import { useSessionStore } from '@/features/session/store'
import { authGuard } from './auth'

function createRoute(path: string, meta: RouteLocationNormalized['meta'] = {}): RouteLocationNormalized {
  return {
    name: undefined,
    path,
    params: {},
    query: {},
    hash: '',
    fullPath: path,
    matched: [],
    redirectedFrom: undefined,
    meta
  }
}

function createSessionStore(options: { isAuthenticated: boolean; currentCircle: null | { id: string; name: string } }) {
  setActivePinia(createPinia())
  const sessionStore = useSessionStore()
  sessionStore.hydrate({
    csrfToken: '',
    currentCircle: options.currentCircle,
    featureFlags: [],
    roles: [],
    user: options.isAuthenticated ? { id: 'user-1', displayName: 'Test User' } : null
  })
  return sessionStore
}

describe('authGuard', () => {
  it('redirects unauthenticated protected route to login', () => {
    const route = createRoute('/workspace/pages', { requiresAuth: true })
    const sessionStore = createSessionStore({
      isAuthenticated: false,
      currentCircle: null
    })

    expect(authGuard(route, sessionStore)).toBe('/login')
  })

  it('redirects authenticated circle-required route without circle', () => {
    const route = createRoute('/workspace/forms', {
      requiresAuth: true,
      requiresCircle: true
    })
    const sessionStore = createSessionStore({
      isAuthenticated: true,
      currentCircle: null
    })

    expect(authGuard(route, sessionStore)).toEqual(buildCircleSelectorLocation('/workspace/forms'))
  })

  it('redirects authenticated /workspace without current circle to selector', () => {
    const route = createRoute('/workspace', {
      requiresAuth: true,
      requiresCircle: true
    })
    const sessionStore = createSessionStore({
      isAuthenticated: true,
      currentCircle: null
    })

    expect(authGuard(route, sessionStore)).toEqual(buildCircleSelectorLocation('/workspace'))
  })

  it('allows authenticated /workspace when current circle exists', () => {
    const route = createRoute('/workspace', {
      requiresAuth: true,
      requiresCircle: true
    })
    const sessionStore = createSessionStore({
      isAuthenticated: true,
      currentCircle: { id: 'circle-1', name: '企画1' }
    })

    expect(authGuard(route, sessionStore)).toBe(true)
  })

  it('redirects staff routes that require a circle when current circle is not selected', () => {
    const route = createRoute('/staff/forms', {
      requiresAuth: true,
      requiresCircle: true
    })
    const sessionStore = createSessionStore({
      isAuthenticated: true,
      currentCircle: null
    })

    expect(authGuard(route, sessionStore)).toEqual(buildCircleSelectorLocation('/staff/forms'))
  })

  it('redirects authenticated user on redirectWhenAuth route to the specified path', () => {
    const route = createRoute('/public/pages', {
      redirectWhenAuth: '/workspace/pages'
    })
    const sessionStore = createSessionStore({
      isAuthenticated: true,
      currentCircle: null
    })

    expect(authGuard(route, sessionStore)).toBe('/workspace/pages')
  })

  it('allows unauthenticated user to access redirectWhenAuth route', () => {
    const route = createRoute('/public/pages', {
      redirectWhenAuth: '/workspace/pages'
    })
    const sessionStore = createSessionStore({
      isAuthenticated: false,
      currentCircle: null
    })

    expect(authGuard(route, sessionStore)).toBe(true)
  })
})
