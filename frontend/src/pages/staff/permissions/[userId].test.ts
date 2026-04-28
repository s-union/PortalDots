import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffPermissionDetailPage from './[userId].vue'

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

function buildPermissionDetail(permissionName: string) {
  return {
    user: {
      id: 'content-user',
      displayName: 'Content User',
      loginIds: ['content@example.com'],
      roles: ['content_manager'],
      permissions: [
        {
          name: permissionName,
          group: 'お知らせ管理',
          displayName: 'スタッフモード › お知らせ管理 › 閲覧と編集',
          shortName: 'お知らせ(編集)',
          description: 'pages'
        }
      ],
      isEditable: true
    },
    definedPermissions: [
      {
        name: 'staff.forms.read',
        group: '申請管理',
        displayName: 'スタッフモード › 申請管理 › フォームの閲覧',
        shortName: '申請(フォームの閲覧)',
        description: 'forms'
      }
    ],
    assignedPermissionNames: [permissionName]
  }
}

describe('StaffPermissionDetailPage', () => {
  it('renders and updates staff permissions', async () => {
    server.use(
      http.get('/v1/staff/permissions/content-user', () =>
        HttpResponse.json(buildPermissionDetail('staff.pages.read'))
      ),
      http.put('/v1/staff/permissions/content-user', () => HttpResponse.json(buildPermissionDetail('staff.forms.read')))
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-a', name: 'デモ企画A' },
      featureFlags: [],
      roles: ['admin'],
      permissions: ['staff.permissions'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/permissions', component: { template: '<div>permissions</div>' } },
        { path: '/staff/permissions/:userId', component: StaffPermissionDetailPage }
      ]
    })
    await router.push('/staff/permissions/content-user')
    await router.isReady()

    const wrapper = mount(StaffPermissionDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Content User')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('スタッフ権限を更新しました。')
  })
})
