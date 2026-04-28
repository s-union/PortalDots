import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
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
  it('shows staff-capable users and edit links when the user can manage roles', async () => {
    server.use(
      http.get('/v1/staff/permissions', () =>
        HttpResponse.json({
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
      )
    )

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

    const wrapper = mount(StaffPermissionsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('スタッフの権限設定')
    expect(wrapper.text()).toContain('Staff User')
    expect(wrapper.text()).toContain('Content User')
    expect(wrapper.text()).not.toContain('Participant User')
    expect(wrapper.text()).toContain('権限設定(全機能)')
    expect(wrapper.get('a[href="/staff/permissions/content-user"]').exists()).toBe(true)
  })
})
