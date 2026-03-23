import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import StaffPermissionsPage from './index.vue'

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

describe('StaffPermissionsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows staff-capable users and edit links when the user can manage roles', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-a',
        name: 'デモ企画A'
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
        { path: '/staff/permissions', component: StaffPermissionsPage },
        {
          path: '/staff/permissions/:userId',
          component: { template: '<div>permission detail</div>' }
        }
      ]
    })
    await router.push('/staff/permissions')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return jsonResponse({ allowed: true, authorized: true })
        }

        if (url.includes('/staff/permissions') && method === 'GET') {
          return jsonResponse({
            items: [
              {
                id: 'staff-user',
                displayName: 'Staff User',
                loginIds: ['staff@example.com'],
                roles: ['admin', 'user_manager'],
                permissions: [
                  {
                    name: 'staff.permissions',
                    group: 'スタッフの権限設定',
                    displayName: 'スタッフモード › スタッフの権限設定 › 全機能',
                    shortName: '権限設定(全機能)',
                    description: 'all'
                  }
                ],
                isEditable: false
              },
              {
                id: 'content-user',
                displayName: 'Content User',
                loginIds: ['content@example.com'],
                roles: ['content_manager'],
                permissions: [
                  {
                    name: 'staff.pages.read,edit',
                    group: 'お知らせ管理',
                    displayName: 'スタッフモード › お知らせ管理 › 閲覧と編集',
                    shortName: 'お知らせ(編集)',
                    description: 'pages'
                  }
                ],
                isEditable: true
              }
            ],
            page: 1,
            pageSize: 20,
            total: 2
          })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffPermissionsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('スタッフ権限ユーザー')
    expect(wrapper.text()).toContain('Staff User')
    expect(wrapper.text()).toContain('Content User')
    expect(wrapper.text()).not.toContain('Participant User')
    expect(wrapper.text()).toContain('権限設定(全機能)')
    expect(wrapper.text()).toContain('編集へ')
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
