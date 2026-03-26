import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffCirclesAllPage from './all.vue'

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

describe('StaffCirclesAllPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders legacy-like toolbar/actions and opens filter drawer', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-a',
        name: '屋台企画A'
      },
      featureFlags: [],
      roles: ['admin'],
      permissions: ['staff.circles'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/circles', component: { template: '<div>circles</div>' } },
        { path: '/staff/circles/all', component: StaffCirclesAllPage },
        { path: '/staff/circles/:circleId', component: { template: '<div>circle detail</div>' } },
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } }
      ]
    })
    await router.push('/staff/circles/all')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
        const parsed = new URL(url, 'http://localhost')
        const pathname = parsed.pathname

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return jsonResponse({ allowed: true, authorized: true })
        }

        if (pathname.endsWith('/staff/circles/all') && method === 'GET') {
          return jsonResponse([
            {
              id: 'circle-a',
              name: '屋台企画A',
              nameYomi: 'ヤタイキカクエー',
              groupName: 'Aブロック',
              groupNameYomi: 'エーブロック',
              participationTypeId: 'participation-type-food',
              participationTypeName: '模擬店',
              tags: ['模擬店'],
              notes: '',
              submittedAt: '2026-03-05T12:00:00Z',
              status: 'pending',
              statusReason: '',
              statusSetAt: null,
              statusSetById: null,
              places: ['第一会場']
            },
            {
              id: 'circle-b',
              name: '展示企画B',
              nameYomi: 'テンジキカクビー',
              groupName: 'Bブロック',
              groupNameYomi: 'ビーブロック',
              participationTypeId: 'participation-type-exhibit',
              participationTypeName: '展示',
              tags: ['展示'],
              notes: 'メモ',
              submittedAt: '2026-03-06T12:00:00Z',
              status: 'approved',
              statusReason: '',
              statusSetAt: null,
              statusSetById: null,
              places: ['第二会場']
            }
          ])
        }

        if (pathname.endsWith('/staff/participation-types') && method === 'GET') {
          return jsonResponse([
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
                openAt: '2026-03-01T00:00:00Z',
                closeAt: '2026-03-31T23:59:59Z',
                isPublic: true,
                isOpen: true,
                maxAnswers: 1,
                isParticipationForm: true,
                answerableTags: [],
                confirmationMessage: ''
              }
            }
          ])
        }

        if (pathname.endsWith('/staff/places') && method === 'GET') {
          return jsonResponse([{ id: 'place-a', name: '第一会場', maxCircleCount: 100 }])
        }

        if (pathname.endsWith('/staff/circles') && method === 'POST') {
          return jsonResponse(
            {
              id: 'circle-c',
              name: '新規企画',
              nameYomi: 'シンキキカク',
              groupName: 'Cブロック',
              groupNameYomi: 'シーブロック',
              participationTypeId: 'participation-type-food',
              participationTypeName: '模擬店',
              tags: ['模擬店'],
              notes: '',
              submittedAt: null,
              status: 'pending',
              statusReason: '',
              statusSetAt: null,
              statusSetById: null,
              places: []
            },
            201
          )
        }

        if (
          (pathname.endsWith('/staff/circles/circle-a') || pathname.endsWith('/staff/circles/circle-b')) &&
          method === 'DELETE'
        ) {
          return new Response(null, { status: 204 })
        }

        if (pathname.endsWith('/staff/circles/export') && method === 'GET') {
          return new Response('', { status: 200 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffCirclesAllPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()],
        stubs: {
          teleport: true
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('新規企画')
    expect(wrapper.text()).toContain('CSVで出力')
    expect(wrapper.text()).toContain('絞り込み')
    expect(wrapper.text()).toContain('表示件数:')
    expect(wrapper.text()).toContain('第一会場')

    const emailLink = wrapper.get('a[title="メール送信"]')
    expect(emailLink.attributes('href')).toBe('/staff/circles/circle-a#mail')

    await wrapper.get('button[title="絞り込み"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('絞り込み条件')

    const searchInput = wrapper.get('input[type="search"]')
    await searchInput.setValue('展示')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('展示企画B')
    expect(wrapper.text()).not.toContain('屋台企画A')

    const deleteButton = wrapper.findAll('button[title="削除"]')[0]
    if (!deleteButton) {
      throw new Error('expected delete button')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    const fetchMock = vi.mocked(globalThis.fetch)
    const deleteCalls = fetchMock.mock.calls.filter((call) => {
      const input = call[0]
      const init = call[1]
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
      return method === 'DELETE' && url.includes('/staff/circles/circle-')
    })
    expect(deleteCalls.length).toBe(1)
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
