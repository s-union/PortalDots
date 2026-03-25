import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffDashboardPage from './index.vue'

const publicConfigMocks = vi.hoisted(() => ({
  usePublicConfigQuery: vi.fn()
}))

vi.mock('@/features/public-home/api', () => ({
  usePublicConfigQuery: publicConfigMocks.usePublicConfigQuery
}))

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

describe('StaffDashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows staff management entry points', async () => {
    publicConfigMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: false, appName: 'PortalDots' })
    })

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

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: StaffDashboardPage },
        { path: '/staff/circles', component: { template: '<div>staff circles</div>' } },
        {
          path: '/staff/participation-types',
          component: { template: '<div>participation types</div>' }
        },
        {
          path: '/staff/activity-logs',
          component: { template: '<div>activity logs</div>' }
        },
        { path: '/staff/pages', component: { template: '<div>staff pages</div>' } },
        { path: '/staff/documents', component: { template: '<div>staff documents</div>' } },
        { path: '/staff/tags', component: { template: '<div>staff tags</div>' } },
        { path: '/staff/places', component: { template: '<div>staff places</div>' } },
        {
          path: '/staff/contacts/categories',
          component: { template: '<div>staff contact categories</div>' }
        },
        { path: '/staff/forms', component: { template: '<div>staff forms</div>' } },
        { path: '/staff/settings', component: { template: '<div>staff settings</div>' } },
        {
          path: '/staff/settings/portal',
          component: { template: '<div>portal settings</div>' }
        },
        { path: '/staff/about', component: { template: '<div>staff about</div>' } },
        {
          path: '/staff/markdown-guide',
          component: { template: '<div>staff markdown guide</div>' }
        },
        {
          path: '/staff/permissions',
          component: { template: '<div>staff permissions</div>' }
        },
        { path: '/staff/users', component: { template: '<div>staff users</div>' } },
        { path: '/staff/exports', component: { template: '<div>exports</div>' } },
        { path: '/staff/mails', component: { template: '<div>mails</div>' } },
        { path: '/circles/select', component: { template: '<div>circle selector</div>' } },
        { path: '/workspace', component: { template: '<div>workspace</div>' } }
      ]
    })
    await router.push('/staff')
    await router.isReady()

    const wrapper = mount(StaffDashboardPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })

    expect(wrapper.text()).toContain('ユーザー情報管理')
    expect(wrapper.text()).toContain('お知らせ管理')
    expect(wrapper.text()).toContain('配布資料管理')
    expect(wrapper.text()).toContain('企画タグ管理')
    expect(wrapper.text()).toContain('場所情報管理')
    expect(wrapper.text()).toContain('お問い合わせ受付設定')
    expect(wrapper.text()).toContain('企画情報管理')
    expect(wrapper.text()).toContain('参加種別管理')
    expect(wrapper.text()).toContain('申請管理')
    expect(wrapper.text()).toContain('スタッフの権限設定')
    expect(wrapper.text()).toContain('CSV / ZIP 出力')
    expect(wrapper.text()).toContain('アクティビティログ')
    expect(wrapper.text()).toContain('PortalDots の設定')
    expect(wrapper.text()).toContain('メールキュー')
  })

  it('hides demo-only disabled staff cards in demo mode', async () => {
    publicConfigMocks.usePublicConfigQuery.mockReturnValue({
      data: ref({ isDemo: true, appName: 'PortalDots Demo' })
    })

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

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: StaffDashboardPage },
        { path: '/staff/circles', component: { template: '<div>staff circles</div>' } },
        {
          path: '/staff/participation-types',
          component: { template: '<div>participation types</div>' }
        },
        { path: '/staff/exports', component: { template: '<div>exports</div>' } },
        { path: '/staff/mails', component: { template: '<div>mails</div>' } }
      ]
    })
    await router.push('/staff')
    await router.isReady()

    const wrapper = mount(StaffDashboardPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })

    const visibleTitles = wrapper
      .findAll('h3')
      .filter((title) => title.isVisible())
      .map((title) => title.text())

    expect(visibleTitles).not.toContain('参加種別管理')
    expect(visibleTitles).not.toContain('CSV / ZIP 出力')
    expect(visibleTitles).not.toContain('メールキュー')
  })
})
