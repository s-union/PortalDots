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

  it('lists and creates circles', async () => {
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

    let created = false
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/circles', component: StaffCirclesIndexPage },
        { path: '/staff/circles/:circleId', component: { template: '<div>detail</div>' } },
        { path: '/staff/participation-types', component: { template: '<div>types</div>' } }
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

        if (pathname.endsWith('/staff/circles/all') && method === 'GET') {
          return new Response(
            JSON.stringify([
              {
                id: 'circle-a',
                name: 'デモ企画A',
                groupName: 'Aブロック',
                participationTypeId: 'participation-type-food',
                participationTypeName: '模擬店'
              },
              {
                id: 'circle-b',
                name: 'デモ企画B',
                groupName: 'Bブロック',
                participationTypeId: 'participation-type-exhibit',
                participationTypeName: '展示'
              }
            ]),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (url.includes('/staff/circles') && method === 'GET') {
          return new Response(
            JSON.stringify({
              items: created
                ? [
                    {
                      id: 'circle-generated-1',
                      name: '追加企画',
                      groupName: 'Cブロック',
                      participationTypeId: 'participation-type-exhibit',
                      participationTypeName: '展示'
                    },
                    {
                      id: 'circle-a',
                      name: 'デモ企画A',
                      groupName: 'Aブロック',
                      participationTypeId: 'participation-type-food',
                      participationTypeName: '模擬店'
                    }
                  ]
                : [
                    {
                      id: 'circle-a',
                      name: 'デモ企画A',
                      groupName: 'Aブロック',
                      participationTypeId: 'participation-type-food',
                      participationTypeName: '模擬店'
                    },
                    {
                      id: 'circle-b',
                      name: 'デモ企画B',
                      groupName: 'Bブロック',
                      participationTypeId: 'participation-type-exhibit',
                      participationTypeName: '展示'
                    }
                  ],
              page: 1,
              pageSize: 10,
              total: 2
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/circles') && method === 'POST') {
          created = true
          return new Response(
            JSON.stringify({
              id: 'circle-generated-1',
              name: '追加企画',
              groupName: 'Cブロック',
              participationTypeId: 'participation-type-exhibit',
              participationTypeName: '展示'
            }),
            {
              status: 201,
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

    expect(wrapper.text()).toContain('デモ企画A')
    expect(wrapper.text()).toContain('模擬店')
    expect(wrapper.text()).toContain('全企画数: 2')
    expect(wrapper.get('a[href="http://127.0.0.1:8081/v1/staff/circles/export"]').text()).toContain('CSVで出力')

    await wrapper.get('input[name="name"]').setValue('追加企画')
    await wrapper.get('input[name="groupName"]').setValue('Cブロック')
    await wrapper.get('select[name="participationTypeId"]').setValue('participation-type-exhibit')
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('追加企画')
  })
})
