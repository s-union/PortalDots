import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests a verification code and confirms staff authorization', async () => {
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

    let staffAuthorized = false
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

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
          return new Response(
            JSON.stringify({
              csrfToken: 'csrf-token',
              currentCircle: null,
              featureFlags: [],
              roles: ['admin'],
              user: {
                id: 'staff-user',
                displayName: 'Staff User'
              }
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return new Response(
            JSON.stringify({
              allowed: true,
              authorized: staffAuthorized
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/verify/request') && method === 'POST') {
          return new Response(
            JSON.stringify({
              message: '認証コードを送信しました。'
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/verify/confirm') && method === 'POST') {
          staffAuthorized = true
          return new Response(null, { status: 204 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

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
