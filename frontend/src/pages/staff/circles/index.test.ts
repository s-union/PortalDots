import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffCirclesIndexPage from './index.vue'

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

describe('StaffCirclesIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows participation type links', async () => {
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
      permissions: ['staff.circles'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/circles', component: StaffCirclesIndexPage },
        { path: '/staff/circles/:circleId', component: { template: '<div>detail</div>' } },
        {
          path: '/staff/circles/participation_types/:typeId',
          component: { template: '<div>type detail</div>' }
        },
        { path: '/staff/circles/all', component: { template: '<div>all circles</div>' } },
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } }
      ]
    })
    await router.push('/staff/circles')
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

        if (pathname.endsWith('/staff/participation-types') && method === 'GET') {
          return new Response(
            JSON.stringify([
              {
                id: 'participation-type-food',
                name: '模擬店',
                description: '',
                usersCountMin: 1,
                usersCountMax: 4,
                tags: ['模擬店'],
                form: {
                  id: 'form-participation-food',
                  name: '企画参加登録',
                  description: '',
                  openAt: '2025-01-10T00:00:00Z',
                  closeAt: '2025-02-10T00:00:00Z',
                  isPublic: true,
                  isOpen: false,
                  maxAnswers: 1,
                  answerableTags: [],
                  confirmationMessage: ''
                }
              },
              {
                id: 'participation-type-exhibit',
                name: '展示',
                description: '',
                usersCountMin: 1,
                usersCountMax: 4,
                tags: ['展示'],
                form: {
                  id: 'form-participation-exhibit',
                  name: '企画参加登録',
                  description: '',
                  openAt: '2025-01-10T00:00:00Z',
                  closeAt: '2025-02-10T00:00:00Z',
                  isPublic: true,
                  isOpen: false,
                  maxAnswers: 1,
                  answerableTags: [],
                  confirmationMessage: ''
                }
              }
            ]),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffCirclesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('参加種別から探す')
    expect(wrapper.text()).toContain('模擬店')
    expect(wrapper.text()).toContain('展示')
    expect(wrapper.get('a[href="/staff/circles/participation_types/participation-type-food"]').text()).toContain(
      '模擬店'
    )
  })
})
