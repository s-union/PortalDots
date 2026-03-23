import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffActivityLogsPage from './activity-logs.vue'

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

describe('StaffActivityLogsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists recorded staff activity logs', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-b',
        name: 'デモ企画B'
      },
      featureFlags: [],
      roles: ['admin'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/activity-logs', component: StaffActivityLogsPage }
      ]
    })
    await router.push('/staff/activity-logs')
    await router.isReady()

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

        if (url.includes('/staff/activity-logs') && method === 'GET') {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 'activity-log-3',
                  actorUserId: 'staff-user',
                  action: 'staff.user.roles_updated',
                  targetType: 'user',
                  targetId: 'demo-user',
                  circleId: '',
                  summary: 'staff がユーザーロールを更新しました: Demo User',
                  createdAt: '2026-03-12T12:00:00Z'
                },
                {
                  id: 'activity-log-2',
                  actorUserId: 'staff-user',
                  action: 'staff.mail.queued',
                  targetType: 'mail_job',
                  targetId: 'mail-job-1',
                  circleId: 'circle-b',
                  summary: 'staff がメールをキューに追加しました: 搬入のご案内',
                  createdAt: '2026-03-12T11:00:00Z'
                }
              ],
              page: 1,
              pageSize: 10,
              total: 2
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffActivityLogsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('活動ログ')
    expect(wrapper.text()).toContain('staff.user.roles_updated')
    expect(wrapper.text()).toContain('Demo User')
    expect(wrapper.text()).toContain('circle-b')
  })
})
