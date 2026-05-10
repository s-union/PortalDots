import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSessionStore } from '@/features/session/store'

const authApiMocks = vi.hoisted(() => ({
  useSuspenseAuthVerificationStatusQuery: vi.fn(),
  useRequestAuthVerificationMutation: vi.fn(),
  extractFirstErrorMessage: vi.fn()
}))

vi.mock('@/features/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api')>('@/features/auth/api')

  return {
    ...actual,
    useSuspenseAuthVerificationStatusQuery: authApiMocks.useSuspenseAuthVerificationStatusQuery,
    useRequestAuthVerificationMutation: authApiMocks.useRequestAuthVerificationMutation,
    extractFirstErrorMessage: authApiMocks.extractFirstErrorMessage
  }
})

import EmailVerifyPage from './verify.vue'

function createQueryPlugin() {
  return [
    VueQueryPlugin,
    {
      queryClient: new QueryClient({
        defaultOptions: {
          queries: { retry: false }
        }
      })
    }
  ]
}

function mockAuthVerificationHooks() {
  const data = ref({
    userId: 'demo-user',
    displayName: 'Demo User',
    completed: false,
    items: [
      {
        type: 'email',
        label: '連絡先メールアドレス',
        address: 'demo@example.com',
        verified: false
      },
      {
        type: 'univemail',
        label: '大学メールアドレス',
        address: '24a0000@example.ac.jp',
        verified: false
      }
    ]
  })
  const refetch = vi.fn().mockResolvedValue(undefined)
  const requestMutateAsync = vi.fn()

  authApiMocks.useSuspenseAuthVerificationStatusQuery.mockReturnValue({
    data,
    suspense: vi.fn().mockResolvedValue(undefined),
    refetch
  })

  authApiMocks.useRequestAuthVerificationMutation.mockReturnValue({
    mutateAsync: requestMutateAsync,
    isPending: ref(false)
  })

  authApiMocks.extractFirstErrorMessage.mockImplementation(() => 'エラーが発生しました')

  return {
    data,
    refetch,
    requestMutateAsync
  }
}

async function mountAtVerify() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const sessionStore = useSessionStore()
  sessionStore.hydrate({
    csrfToken: 'csrf-token',
    currentCircle: null,
    featureFlags: [],
    roles: ['participant'],
    user: {
      id: 'demo-user',
      displayName: 'Demo User'
    }
  })

  const authHooks = mockAuthVerificationHooks()

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
      { path: '/email/verify', component: EmailVerifyPage },
      { path: '/email/verify/completed', component: { template: '<div>completed</div>' } }
    ]
  })

  await router.push('/email/verify')
  await router.isReady()

  const wrapper = mount(EmailVerifyPage, {
    global: {
      plugins: [pinia, router, createQueryPlugin()]
    }
  })
  await flushPromises()

  return {
    authHooks,
    router,
    wrapper
  }
}

describe('EmailVerifyPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows verify sections and settings link', async () => {
    const { wrapper } = await mountAtVerify()

    expect(wrapper.text()).toContain('まだユーザー登録は完了していません！')
    expect(wrapper.text()).toContain('Demo User')
    expect(wrapper.text()).toContain('連絡先メールアドレス')
    expect(wrapper.text()).toContain(
      '連絡用メールアドレスにお知らせを届けるには、連絡先メールアドレスの認証が必要です。'
    )
    expect(wrapper.get('a[href="/workspace/settings"]').text()).toContain('登録情報の変更')
    expect(wrapper.get('a[href="/"]').text()).toContain('トップページに戻る')
  })

  it('shows an auto-sent guidance message from query params', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User'
      }
    })

    mockAuthVerificationHooks()

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
        { path: '/email/verify', component: EmailVerifyPage },
        { path: '/email/verify/completed', component: { template: '<div>completed</div>' } }
      ]
    })

    await router.push('/email/verify?sent=email')
    await router.isReady()

    const wrapper = mount(EmailVerifyPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('連絡先メールアドレスに認証URLを送信しました。')
  })

  it('redirects to the completed page when verification is already complete', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User'
      }
    })

    const data = ref({
      userId: 'demo-user',
      displayName: 'Demo User',
      completed: true,
      items: [
        {
          type: 'univemail',
          label: '大学メールアドレス',
          address: '24a0000@example.ac.jp',
          verified: true
        }
      ]
    })
    authApiMocks.useSuspenseAuthVerificationStatusQuery.mockReturnValue({
      data,
      suspense: vi.fn().mockResolvedValue(undefined),
      refetch: vi.fn().mockResolvedValue(undefined)
    })
    authApiMocks.useRequestAuthVerificationMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: ref(false)
    })
    authApiMocks.extractFirstErrorMessage.mockImplementation(() => 'エラーが発生しました')

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
        { path: '/email/verify', component: EmailVerifyPage },
        { path: '/email/verify/completed', component: { template: '<div>completed</div>' } }
      ]
    })

    await router.push('/email/verify')
    await router.isReady()

    mount(EmailVerifyPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/email/verify/completed')
  })

  it('keeps the page open when only the optional contact email remains unverified', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User'
      }
    })

    const data = ref({
      userId: 'demo-user',
      displayName: 'Demo User',
      completed: true,
      items: [
        {
          type: 'email',
          label: '連絡先メールアドレス',
          address: 'demo@example.com',
          verified: false
        },
        {
          type: 'univemail',
          label: '大学メールアドレス',
          address: '24a0000@example.ac.jp',
          verified: true
        }
      ]
    })
    authApiMocks.useSuspenseAuthVerificationStatusQuery.mockReturnValue({
      data,
      suspense: vi.fn().mockResolvedValue(undefined),
      refetch: vi.fn().mockResolvedValue(undefined)
    })
    authApiMocks.useRequestAuthVerificationMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: ref(false)
    })
    authApiMocks.extractFirstErrorMessage.mockImplementation(() => 'エラーが発生しました')

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
        { path: '/email/verify', component: EmailVerifyPage },
        { path: '/email/verify/completed', component: { template: '<div>completed</div>' } }
      ]
    })

    await router.push('/email/verify')
    await router.isReady()

    const wrapper = mount(EmailVerifyPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/email/verify')
    expect(wrapper.text()).toContain(
      '連絡用メールアドレスにお知らせを届けるには、連絡先メールアドレスの認証が必要です。'
    )
  })

  it('renders nested child routes via RouterView', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: '',
      currentCircle: null,
      featureFlags: [],
      roles: [],
      user: null
    })

    mockAuthVerificationHooks()

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/email/verify',
          component: EmailVerifyPage,
          children: [{ path: ':type/:userId', component: { template: '<div>signed verify child</div>' } }]
        }
      ]
    })

    await router.push('/email/verify/univemail/user-123')
    await router.isReady()

    const wrapper = mount(EmailVerifyPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('signed verify child')
    expect(wrapper.text()).not.toContain('まだユーザー登録は完了していません！')
  })

  it('requests a verification email and refreshes the status', async () => {
    const { authHooks, wrapper } = await mountAtVerify()
    authHooks.requestMutateAsync.mockResolvedValue({
      message: '認証URLを送信しました。'
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '認証メールを送信')
      ?.trigger('click')
    await flushPromises()

    expect(authHooks.requestMutateAsync).toHaveBeenCalledWith('email')
    expect(authHooks.refetch).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('認証URLを送信しました。')
  })

  it('shows an extracted error message when requesting verification fails', async () => {
    const { authHooks, wrapper } = await mountAtVerify()
    authHooks.requestMutateAsync.mockRejectedValueOnce(new Error('request failed'))

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '認証メールを送信')
      ?.trigger('click')
    await flushPromises()

    expect(authApiMocks.extractFirstErrorMessage).toHaveBeenCalled()
    expect(wrapper.text()).toContain('エラーが発生しました')
  })
})
