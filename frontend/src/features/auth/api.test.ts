import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const tanstackMocks = vi.hoisted(() => ({
  useMutation: vi.fn((options) => options),
  useQuery: vi.fn((options) => options),
  useQueryClient: vi.fn()
}))

const apiClientMocks = vi.hoisted(() => ({
  createJsonHeaders: vi.fn((csrfToken?: string) =>
    csrfToken && csrfToken.trim() !== ''
      ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
      : { 'Content-Type': 'application/json' }
  ),
  $api: {
    noContentMutation: vi.fn(),
    mutationData: vi.fn(),
    queryData: vi.fn(),
    useQueryData: vi.fn()
  },
  $apiSuspense: {
    useSuspenseQueryData: vi.fn()
  }
}))

const sessionApiMocks = vi.hoisted(() => ({
  fetchSessionBootstrap: vi.fn()
}))

const sessionStoreMocks = vi.hoisted(() => ({
  store: {
    csrfToken: 'csrf-token',
    roles: ['participant'],
    permissions: [],
    hydrate: vi.fn(),
    reset: vi.fn()
  }
}))

vi.mock('@tanstack/vue-query', () => ({
  useMutation: tanstackMocks.useMutation,
  useQuery: tanstackMocks.useQuery,
  useQueryClient: tanstackMocks.useQueryClient
}))

vi.mock('@/lib/api/client', () => ({
  createJsonHeaders: apiClientMocks.createJsonHeaders,
  $api: apiClientMocks.$api,
  $apiSuspense: apiClientMocks.$apiSuspense
}))

vi.mock('@/features/session/api', () => ({
  fetchSessionBootstrap: sessionApiMocks.fetchSessionBootstrap
}))

vi.mock('@/features/session/store', () => ({
  useSessionStore: () => sessionStoreMocks.store
}))

import {
  completeRegistration,
  extractFirstErrorMessage,
  login,
  logout,
  requestAuthVerification,
  useAuthVerificationStatusQuery,
  useCompleteRegistrationMutation,
  useConfirmAuthVerificationMutation,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useRequestAuthVerificationMutation
} from './api'

describe('auth api', () => {
  const setQueryData = vi.fn()
  const clear = vi.fn()
  const invalidateQueries = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()

    tanstackMocks.useMutation.mockImplementation((options) => options)
    tanstackMocks.useQuery.mockImplementation((options) => options)
    tanstackMocks.useQueryClient.mockReturnValue({
      setQueryData,
      clear,
      invalidateQueries
    })

    apiClientMocks.$api.noContentMutation.mockResolvedValue(undefined)
    apiClientMocks.$api.mutationData.mockResolvedValue({ message: 'sent' })
    apiClientMocks.$api.queryData.mockResolvedValue(undefined)
    apiClientMocks.$api.useQueryData.mockImplementation((_method, _path, _request, _parser, options) => options)
    apiClientMocks.$apiSuspense.useSuspenseQueryData.mockImplementation(
      (_method, _path, _request, _parser, options, meta) => ({ options, meta })
    )

    sessionStoreMocks.store.csrfToken = 'csrf-token'
    sessionStoreMocks.store.hydrate.mockReset()
    sessionStoreMocks.store.reset.mockReset()
    sessionApiMocks.fetchSessionBootstrap.mockResolvedValue({
      csrfToken: 'next-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      permissions: [],
      user: {
        id: 'user-1',
        displayName: 'Demo User',
        canDeleteAccount: false,
        canCreateCircleRegistration: true
      }
    })
  })

  it('sends login requests through the shared API client', async () => {
    await login({ loginId: 'demo@example.com', password: 'password' })

    expect(apiClientMocks.$api.noContentMutation).toHaveBeenCalledWith(
      'post',
      '/auth/login',
      {
        headers: { 'Content-Type': 'application/json' },
        body: { loginId: 'demo@example.com', password: 'password' }
      },
      expect.objectContaining({ errorMessage: 'Failed to login' })
    )
  })

  it('sends logout requests with the csrf token', async () => {
    await logout('csrf-token')

    expect(apiClientMocks.$api.noContentMutation).toHaveBeenCalledWith(
      'post',
      '/auth/logout',
      {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-token' }
      },
      expect.objectContaining({ errorMessage: 'Failed to logout' })
    )
  })

  it('normalizes optional contactEmail when completing registration', async () => {
    await completeRegistration({
      pendingRegistrationId: 'pending-1',
      token: 'token',
      name: 'Portal Dots',
      nameYomi: 'ぽーたる どっつ',
      phoneNumber: '090-0000-0000',
      password: 'password1',
      passwordConfirmation: 'password1'
    })

    expect(apiClientMocks.$api.noContentMutation).toHaveBeenCalledWith(
      'post',
      '/auth/register/complete',
      expect.objectContaining({
        body: expect.objectContaining({
          contactEmail: ''
        })
      }),
      expect.objectContaining({ errorMessage: 'Failed to complete registration' })
    )
  })

  it('passes type and csrf token when requesting verification', async () => {
    await requestAuthVerification('email', 'csrf-token')

    expect(apiClientMocks.$api.mutationData).toHaveBeenCalledWith(
      'post',
      '/auth/verification/request',
      {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf-token' },
        body: { type: 'email' }
      },
      expect.any(Function),
      expect.objectContaining({ errorMessage: 'Failed to request auth verification' })
    )
  })

  it('hydrates the session and updates the bootstrap cache after login/register/complete', async () => {
    const loginMutation = useLoginMutation()
    const registerMutation = useRegisterMutation()
    const completeMutation = useCompleteRegistrationMutation()

    await loginMutation.onSuccess?.()
    await registerMutation.onSuccess?.()
    await completeMutation.onSuccess?.()

    expect(sessionApiMocks.fetchSessionBootstrap).toHaveBeenCalledTimes(3)
    expect(sessionStoreMocks.store.hydrate).toHaveBeenCalledTimes(3)
    expect(setQueryData).toHaveBeenCalledWith(
      ['session', 'bootstrap'],
      expect.objectContaining({
        csrfToken: 'next-token'
      })
    )
  })

  it('resets session state and clears the query cache after logout', async () => {
    const logoutMutation = useLogoutMutation()

    await logoutMutation.onSuccess?.()

    expect(sessionStoreMocks.store.reset).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('invalidates verification queries after request and confirm mutations succeed', async () => {
    const requestMutation = useRequestAuthVerificationMutation()
    const confirmMutation = useConfirmAuthVerificationMutation()

    await requestMutation.onSuccess?.()
    await confirmMutation.onSuccess?.()

    expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['auth', 'verification'] })
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['auth', 'verification'] })
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, { queryKey: ['session', 'bootstrap'] })
  })

  it('wires the verification status query with reactive enabled and retry=false', () => {
    const query = useAuthVerificationStatusQuery(ref(false))

    expect(tanstackMocks.useQuery).toHaveBeenCalledTimes(1)
    expect(query.queryKey).toEqual(['auth', 'verification'])
    expect(query.enabled.value).toBe(false)
    expect(query.retry).toBe(false)
  })

  it('extracts a fallback message from wrapped validation errors', () => {
    const error = new Error('wrapped', {
      cause: {
        message: 'Validation failed',
        errors: {
          loginId: ['ログインに失敗しました。']
        }
      }
    })

    expect(extractFirstErrorMessage(error)).toBe('ログインに失敗しました。')
    expect(extractFirstErrorMessage(new Error('plain'))).toBe('ログインに失敗しました。')
  })
})
