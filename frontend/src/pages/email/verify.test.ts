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
  authApiMocks.useSuspenseAuthVerificationStatusQuery.mockReturnValue({
    data: ref({
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
    }),
    suspense: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn().mockResolvedValue(undefined)
  })

  authApiMocks.useRequestAuthVerificationMutation.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: ref(false)
  })

  authApiMocks.useConfirmAuthVerificationMutation.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: ref(false)
  })

  authApiMocks.extractFirstErrorMessage.mockImplementation(() => 'エラーが発生しました')
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

  mockAuthVerificationHooks()

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
      { path: '/email/verify', component: EmailVerifyPage }
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

  return wrapper
}

describe('EmailVerifyPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows verify sections and settings link', async () => {
    const wrapper = await mountAtVerify()

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
})
