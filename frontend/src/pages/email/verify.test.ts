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
  useConfirmAuthVerificationMutation: vi.fn(),
  extractFirstErrorMessage: vi.fn()
}))

vi.mock('@/features/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api')>('@/features/auth/api')

  return {
    ...actual,
    useSuspenseAuthVerificationStatusQuery: authApiMocks.useSuspenseAuthVerificationStatusQuery,
    useRequestAuthVerificationMutation: authApiMocks.useRequestAuthVerificationMutation,
    useConfirmAuthVerificationMutation: authApiMocks.useConfirmAuthVerificationMutation,
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
  const confirmMutateAsync = vi.fn()

  authApiMocks.useSuspenseAuthVerificationStatusQuery.mockReturnValue({
    data,
    suspense: vi.fn().mockResolvedValue(undefined),
    refetch
  })

  authApiMocks.useRequestAuthVerificationMutation.mockReturnValue({
    mutateAsync: requestMutateAsync,
    isPending: ref(false)
  })

  authApiMocks.useConfirmAuthVerificationMutation.mockReturnValue({
    mutateAsync: confirmMutateAsync,
    isPending: ref(false)
  })

  authApiMocks.extractFirstErrorMessage.mockImplementation(() => 'エラーが発生しました')

  return {
    data,
    refetch,
    requestMutateAsync,
    confirmMutateAsync
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
    expect(wrapper.get('a[href="/workspace/settings"]').text()).toContain('登録情報の変更')
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

  it('requests a verification code and refreshes the status', async () => {
    const { authHooks, wrapper } = await mountAtVerify()
    authHooks.requestMutateAsync.mockResolvedValue({
      verifyCode: '654321',
      message: '認証コードを表示しました'
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '認証コードを表示')
      ?.trigger('click')
    await flushPromises()

    expect(authHooks.requestMutateAsync).toHaveBeenCalledWith('email')
    expect(authHooks.refetch).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('認証コード: 654321')
    expect(wrapper.text()).toContain('認証コードを表示しました')
  })

  it('shows an extracted error message when requesting verification fails', async () => {
    const { authHooks, wrapper } = await mountAtVerify()
    authHooks.requestMutateAsync.mockRejectedValueOnce(new Error('request failed'))

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '認証コードを表示')
      ?.trigger('click')
    await flushPromises()

    expect(authApiMocks.extractFirstErrorMessage).toHaveBeenCalled()
    expect(wrapper.text()).toContain('エラーが発生しました')
  })

  it('confirms verification, clears the input, and redirects on completion', async () => {
    const { authHooks, router, wrapper } = await mountAtVerify()
    authHooks.confirmMutateAsync.mockImplementation(async () => {
      authHooks.data.value = {
        ...authHooks.data.value,
        completed: true
      }
    })
    authHooks.refetch.mockResolvedValue(undefined)

    const codeInput = wrapper.get('input[name="email-verify-code"]')
    await codeInput.setValue('123456')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '認証する')
      ?.trigger('click')
    await flushPromises()

    expect(authHooks.confirmMutateAsync).toHaveBeenCalledWith({
      type: 'email',
      verifyCode: '123456'
    })
    expect(authHooks.refetch).toHaveBeenCalledTimes(1)
    expect((codeInput.element as HTMLInputElement).value).toBe('')
    expect(router.currentRoute.value.fullPath).toBe('/email/verify/completed')
  })

  it('shows an extracted error message when confirmation fails', async () => {
    const { authHooks, wrapper } = await mountAtVerify()
    authHooks.confirmMutateAsync.mockRejectedValueOnce(new Error('confirm failed'))

    const codeInput = wrapper.get('input[name="email-verify-code"]')
    await codeInput.setValue('123456')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '認証する')
      ?.trigger('click')
    await flushPromises()

    expect(authApiMocks.extractFirstErrorMessage).toHaveBeenCalled()
    expect(wrapper.text()).toContain('エラーが発生しました')
  })
})
