import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffDashboardPage from './index.vue'
import StaffVerifyPage from './verify.vue'

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

describe('StaffVerifyPage', () => {
  it('requests a verification code and confirms staff authorization', async () => {
    let staffAuthorized = false
    server.use(
      http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: staffAuthorized })),
      http.post('/v1/staff/verify/request', () => HttpResponse.json({ message: '認証コードを送信しました。' })),
      http.post('/v1/staff/verify/confirm', () => {
        staffAuthorized = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/staff/verify', component: StaffVerifyPage },
        { path: '/staff', component: StaffDashboardPage },
        { path: '/staff/pages', component: { template: '<div>staff pages</div>' } }
      ]
    })
    await router.push('/staff/verify')
    await router.isReady()

    const wrapper = mount(StaffVerifyPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('認証コードを送信しました。')

    await wrapper.get('input[name="verifyCode"]').setValue('123456')
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/staff')
  })
})
