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
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/staff', component: StaffDashboardPage },
        { path: '/staff/circles', component: { template: '<div>staff circles</div>' } },
        {
          path: '/staff/circles/participation_types',
          component: { template: '<div>participation types</div>' }
        },
        {
          path: '/staff/activity-logs',
          component: { template: '<div>activity logs</div>' }
        },
        { path: '/staff/pages', component: { template: '<div>staff pages</div>' } },
        { path: '/staff/mails', component: { template: '<div>staff mails</div>' } },
        { path: '/staff/documents', component: { template: '<div>staff documents</div>' } },
        { path: '/staff/tags', component: { template: '<div>staff tags</div>' } },
        { path: '/staff/places', component: { template: '<div>staff places</div>' } },
        {
          path: '/staff/contact-categories',
          component: { template: '<div>staff contact categories</div>' }
        },
        { path: '/staff/forms', component: { template: '<div>staff forms</div>' } },
        { path: '/staff/settings', component: { template: '<div>staff settings</div>' } },
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
    expect(wrapper.text()).toContain('メール配信設定')
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
    expect(wrapper.text()).toContain('PortalDotsに登録しているユーザーの情報を管理します')
    expect(wrapper.text()).toContain('PortalDots上に表示するお知らせを管理します')
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
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/staff', component: StaffDashboardPage },
        { path: '/staff/circles', component: { template: '<div>staff circles</div>' } },
        {
          path: '/staff/circles/participation_types',
          component: { template: '<div>participation types</div>' }
        },
        {
          path: '/staff/activity-logs',
          component: { template: '<div>activity logs</div>' }
        },
        { path: '/staff/pages', component: { template: '<div>staff pages</div>' } },
        { path: '/staff/mails', component: { template: '<div>staff mails</div>' } },
        { path: '/staff/documents', component: { template: '<div>staff documents</div>' } },
        { path: '/staff/tags', component: { template: '<div>staff tags</div>' } },
        { path: '/staff/places', component: { template: '<div>staff places</div>' } },
        {
          path: '/staff/contact-categories',
          component: { template: '<div>staff contact categories</div>' }
        },
        { path: '/staff/forms', component: { template: '<div>staff forms</div>' } },
        { path: '/staff/settings', component: { template: '<div>staff settings</div>' } },
        {
          path: '/staff/markdown-guide',
          component: { template: '<div>staff markdown guide</div>' }
        },
        {
          path: '/staff/permissions',
          component: { template: '<div>staff permissions</div>' }
        },
        { path: '/staff/users', component: { template: '<div>staff users</div>' } },
        { path: '/staff/exports', component: { template: '<div>exports</div>' } }
      ]
    })
    await router.push('/staff')
    await router.isReady()

    const wrapper = mount(StaffDashboardPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })

    const visibleCards = wrapper
      .findAll('a[href]')
      .filter((link) => link.isVisible())
      .map((link) => link.text())
      .join('\n')

    expect(visibleCards).not.toContain('参加種別管理')
    expect(visibleCards).not.toContain('CSV / ZIP 出力')
    expect(visibleCards).not.toContain('メール配信設定')
  })
})
