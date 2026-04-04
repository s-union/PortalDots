import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffAboutPage from './about.vue'

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

describe('StaffAboutPage', () => {
  it('shows staff-facing PortalDots update information', async () => {
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
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/about', component: StaffAboutPage }
      ]
    })
    await router.push('/staff/about')
    await router.isReady()

    const wrapper = mount(StaffAboutPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })

    expect(wrapper.text()).toContain('PortalDotsについて')
    expect(wrapper.text()).toContain('バージョン 5.0.2 の詳細')
    expect(wrapper.text()).toContain('PortalDots(ポータルドット)は')
    expect(wrapper.text()).toContain('PortalDots で利用している各種ライブラリを更新しました。')
    expect(wrapper.get('a[href="https://www.portaldots.com"]').attributes('target')).toBe('_blank')
  })
})
