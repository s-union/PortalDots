import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSessionStore } from '@/features/session/store'
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

function buildFetchMock() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    await Promise.resolve()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const pathname = new URL(url, 'http://localhost').pathname

    if (pathname.endsWith('/auth/verification') && method === 'GET') {
      return new Response(
        JSON.stringify({
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
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unexpected request: ${method} ${url}`)
  })
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
  vi.stubGlobal('fetch', buildFetchMock())

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
