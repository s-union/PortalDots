import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia } from 'pinia'
import { pinia } from '@/app/providers/pinia'
import { queryClient } from '@/app/providers/queryClient'

const sessionApiMocks = vi.hoisted(() => ({
  fetchSessionBootstrap: vi.fn()
}))

const staffStatusApiMocks = vi.hoisted(() => ({
  fetchStaffStatus: vi.fn()
}))

vi.mock('@/features/session/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/session/api')>('@/features/session/api')

  return {
    ...actual,
    fetchSessionBootstrap: sessionApiMocks.fetchSessionBootstrap
  }
})

vi.mock('@/features/staff/status/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/staff/status/api')>('@/features/staff/status/api')

  return {
    ...actual,
    fetchStaffStatus: staffStatusApiMocks.fetchStaffStatus
  }
})

import { router } from './index'

describe('app router guards', () => {
  beforeEach(() => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: '',
      currentCircle: null,
      featureFlags: [],
      roles: [],
      permissions: [],
      user: null
    })
    staffStatusApiMocks.fetchStaffStatus.mockResolvedValue({
      allowed: true,
      authorized: true
    })
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    queryClient.clear()
    setActivePinia(pinia)
    await router.replace('/')
  })

  it('redirects unauthenticated workspace pages access to login', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: '',
      currentCircle: null,
      featureFlags: [],
      roles: [],
      permissions: [],
      user: null
    })

    await router.push('/workspace/pages')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('redirects authenticated workspace pages without current circle to selector', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      permissions: [],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    await router.push('/workspace/pages')

    expect(router.currentRoute.value.fullPath).toBe('/circles/select?redirect=/workspace/pages')
  })

  it('redirects authenticated workspace root to home when current circle exists', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-b',
        name: 'デモ企画B'
      },
      featureFlags: [],
      roles: ['participant'],
      permissions: [],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    await router.push('/workspace')

    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('allows global staff pages without current circle', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['admin'],
      permissions: [],
      user: {
        id: 'staff-user',
        displayName: 'Staff User',
        canDeleteAccount: false
      }
    })

    for (const path of [
      '/staff/places',
      '/staff/tags',
      '/staff/contacts/categories',
      '/staff/pages',
      '/staff/documents',
      '/staff/forms',
      '/staff/exports',
      '/staff/mails'
    ]) {
      await router.push(path)
      expect(router.currentRoute.value.fullPath).toBe(path)
    }
  })

  it('redirects authenticated register access to home via public-only guard', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      permissions: [],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    await router.push('/register')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('redirects unauthenticated email verify access to login', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: '',
      currentCircle: null,
      featureFlags: [],
      roles: [],
      permissions: [],
      user: null
    })

    await router.push('/email/verify')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('redirects authenticated signed password reset links to home via public-only guard', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      permissions: [],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    await router.push('/password/reset/user-123')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('redirects authenticated signed email verify links to home via public-only guard', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      permissions: [],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canDeleteAccount: false
      }
    })

    await router.push('/email/verify/email/user-123')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('allows unauthenticated signed email verify links', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: '',
      currentCircle: null,
      featureFlags: [],
      roles: [],
      permissions: [],
      user: null
    })

    await router.push('/email/verify/univemail/user-123?token=token-abc')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/email/verify/univemail/user-123?token=token-abc')
  })

  it('redirects unauthenticated email verify completed access to login', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: '',
      currentCircle: null,
      featureFlags: [],
      roles: [],
      permissions: [],
      user: null
    })

    await router.push('/email/verify/completed')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('redirects staff dashboard access to staff verify when not yet authorized', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-a',
        name: 'デモ企画A'
      },
      featureFlags: [],
      roles: ['admin'],
      permissions: [],
      user: {
        id: 'staff-user',
        displayName: 'Staff User',
        canDeleteAccount: false
      }
    })
    staffStatusApiMocks.fetchStaffStatus.mockResolvedValue({
      allowed: true,
      authorized: false
    })

    await router.push('/staff')

    expect(router.currentRoute.value.fullPath).toBe('/staff/verify')
  })

  it('redirects non-admin staff activity log access to staff top', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-a',
        name: 'デモ企画A'
      },
      featureFlags: [],
      roles: ['circle_manager'],
      permissions: [],
      user: {
        id: 'circle-user',
        displayName: 'Circle User',
        canDeleteAccount: false
      }
    })

    await router.push('/staff/activity-logs')

    expect(router.currentRoute.value.fullPath).toBe('/staff')
  })

  it('redirects non-admin staff portal settings access to staff top', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-a',
        name: 'デモ企画A'
      },
      featureFlags: [],
      roles: ['content_manager'],
      permissions: [],
      user: {
        id: 'content-user',
        displayName: 'Content User',
        canDeleteAccount: false
      }
    })

    await router.push('/staff/settings/portal')

    expect(router.currentRoute.value.fullPath).toBe('/staff')
  })

  it('allows staff circle mail access with circle edit permission', async () => {
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-a',
        name: 'デモ企画A'
      },
      featureFlags: [],
      roles: [],
      permissions: ['staff.circles.read,edit'],
      user: {
        id: 'circle-user',
        displayName: 'Circle User',
        canDeleteAccount: false
      }
    })

    await router.push('/staff/circles/circle-a/email')

    expect(router.currentRoute.value.fullPath).toBe('/staff/circles/circle-a/email')
  })

  it('resolves unknown routes to the not-found page', async () => {
    await router.push('/definitely-missing')

    const matchedRoutes = router.currentRoute.value.matched
    expect(matchedRoutes[matchedRoutes.length - 1]?.path).toBe('/:all(.*)')
  })

  it('opens the support page without session bootstrap', async () => {
    await router.push('/support')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/support')
    expect(sessionApiMocks.fetchSessionBootstrap).not.toHaveBeenCalled()
  })

  it('opens the privacy policy page without session bootstrap', async () => {
    await router.push('/privacy_policy')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/privacy_policy')
    expect(sessionApiMocks.fetchSessionBootstrap).not.toHaveBeenCalled()
  })
})
