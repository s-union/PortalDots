import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffUserDetailPage from './[userId].vue'

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

describe('StaffUserDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function expectInputValue(wrapper: ReturnType<typeof mount>, selector: string, expected: string) {
    const element = wrapper.get(selector).element
    if (!(element instanceof HTMLInputElement)) {
      throw new Error(`Expected HTMLInputElement for ${selector}`)
    }
    expect(element.value).toBe(expected)
  }

  it('loads and updates user profile, roles, and verification', async () => {
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

    let updatedRoles = ['participant']
    let displayName = 'Demo User'
    let loginIds = ['demo@example.com', '24a0000']
    let isVerified = false
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/users', component: { template: '<div>users</div>' } },
        { path: '/staff/users/:userId', component: StaffUserDetailPage }
      ]
    })
    await router.push('/staff/users/demo-user')
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

        if (pathname.endsWith('/staff/users/demo-user') && method === 'GET') {
          return new Response(
            JSON.stringify({
              id: 'demo-user',
              lastName: 'デモ',
              lastNameReading: 'でも',
              firstName: 'ユーザー',
              firstNameReading: 'ゆーざー',
              displayName,
              loginIds,
              contactEmail: 'demo@example.com',
              phoneNumber: '090-0000-0001',
              roles: updatedRoles,
              isVerified,
              isEmailVerified: false
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/users/demo-user') && method === 'PUT') {
          displayName = 'Updated Demo User'
          loginIds = ['updated@example.com', '24a9999']
          return new Response(
            JSON.stringify({
              id: 'demo-user',
              lastName: 'デモ',
              lastNameReading: 'でも',
              firstName: 'ユーザー',
              firstNameReading: 'ゆーざー',
              displayName,
              loginIds,
              contactEmail: 'updated@example.com',
              phoneNumber: '090-0000-0001',
              roles: updatedRoles,
              isVerified,
              isEmailVerified: false
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/users/demo-user/roles') && method === 'PUT') {
          updatedRoles = ['participant', 'forms_manager']
          return new Response(
            JSON.stringify({
              id: 'demo-user',
              lastName: 'デモ',
              lastNameReading: 'でも',
              firstName: 'ユーザー',
              firstNameReading: 'ゆーざー',
              displayName,
              loginIds,
              contactEmail: 'demo@example.com',
              phoneNumber: '090-0000-0001',
              roles: updatedRoles,
              isVerified,
              isEmailVerified: false
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/users/demo-user/verify') && method === 'PATCH') {
          isVerified = true
          return new Response(
            JSON.stringify({
              id: 'demo-user',
              lastName: 'デモ',
              lastNameReading: 'でも',
              firstName: 'ユーザー',
              firstNameReading: 'ゆーざー',
              displayName,
              loginIds,
              contactEmail: 'demo@example.com',
              phoneNumber: '090-0000-0001',
              roles: updatedRoles,
              isVerified,
              isEmailVerified: false
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
          return new Response(
            JSON.stringify({
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

    const wrapper = mount(StaffUserDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expectInputValue(wrapper, 'input[name="displayName"]', 'Demo User')
    expect(wrapper.text()).toContain('参加者')
    expect(wrapper.text()).toContain('本人確認未完了')

    await wrapper.get('input[name="displayName"]').setValue('Updated Demo User')
    await wrapper.get('textarea[name="loginIds"]').setValue('updated@example.com\n24a9999')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('ユーザー情報を更新しました。')
    expectInputValue(wrapper, 'input[name="displayName"]', 'Updated Demo User')

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('本人確認を完了しました。')
    expect(wrapper.text()).toContain('本人確認済み')

    await wrapper.get('input[name="forms_manager"]').setValue(true)
    await wrapper.findAll('button[type="submit"]')[1]?.trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('ロールを更新しました。')
    expect(wrapper.text()).toContain('申請管理')
  })
})
