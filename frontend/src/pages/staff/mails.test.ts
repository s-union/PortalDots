import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffMailsPage from './mails.vue'

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

describe('StaffMailsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists queued mails and cancels all jobs', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['admin'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    let hasQueuedMail = true
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/pages', component: { template: '<div>pages</div>' } },
        { path: '/staff/mails', component: StaffMailsPage }
      ]
    })
    await router.push('/staff/mails')
    await router.isReady()

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return new Response(JSON.stringify({ allowed: true, authorized: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        if (pathname.endsWith('/staff/mails') && method === 'GET') {
          return new Response(
            JSON.stringify(
              hasQueuedMail
                ? [
                    {
                      circle: {
                        id: '',
                        name: '共通'
                      },
                      id: 'mail-job-1',
                      subject: '搬入のご案内',
                      body: '9:00 に集合してください。',
                      recipients: ['demo@example.com', 'sub@example.com'],
                      status: 'queued',
                      createdAt: '2026-03-12T00:00:00Z',
                      deliveredAt: ''
                    },
                    {
                      circle: {
                        id: '',
                        name: '共通'
                      },
                      id: 'mail-job-2',
                      subject: '宛先不達のお知らせ',
                      body: '宛先エラーのため配信できませんでした。',
                      recipients: ['invalid@example.com'],
                      status: 'undeliverable',
                      createdAt: '2026-03-12T01:00:00Z',
                      deliveredAt: '2026-03-12T01:05:00Z'
                    }
                  ]
                : []
            ),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/mails') && method === 'DELETE') {
          hasQueuedMail = false
          return new Response(null, { status: 204 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffMailsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('搬入のご案内')
    expect(wrapper.text()).toContain('宛先不達のお知らせ')
    expect(wrapper.text()).toContain('demo@example.com, sub@example.com')
    expect(wrapper.text()).toContain('待機中')
    expect(wrapper.text()).toContain('配信不能')
    const undeliverableBadge = wrapper.findAll('span').find((node) => node.text() === '配信不能')
    expect(undeliverableBadge?.classes()).toContain('text-danger')
    expect(wrapper.text()).toContain('キューを全件キャンセル')

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('メールキューはありません。')
  })
})
