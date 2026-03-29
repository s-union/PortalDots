import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffParticipationTypeCirclesPage from './[typeId]/index.vue'

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

describe('StaffParticipationTypeCirclesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders tab strip, circles grid, and can navigate to the edit tab', async () => {
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
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } },
        {
          path: '/staff/circles/participation_types/:typeId',
          component: StaffParticipationTypeCirclesPage
        },
        { path: '/staff/circles/participation_types/:typeId/edit', component: { template: '<div>edit</div>' } },
        { path: '/staff/circles/participation_types/:typeId/form/edit', component: { template: '<div>form</div>' } },
        { path: '/staff/circles/:circleId', component: { template: '<div>circle detail</div>' } },
        { path: '/staff/forms/:formId/answers/uploads', component: { template: '<div>uploads</div>' } }
      ]
    })
    await router.push('/staff/circles/participation_types/participation-type-food')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return jsonResponse({ allowed: true, authorized: true })
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'GET') {
          return jsonResponse({
            id: 'participation-type-food',
            name: '模擬店',
            description: '模擬店の参加種別です。',
            usersCountMin: 1,
            usersCountMax: 4,
            tags: ['模擬店'],
            form: {
              id: 'form-participation-food',
              name: '企画参加登録',
              description: '参加登録を提出してください。',
              openAt: '2026-03-01T00:00:00Z',
              closeAt: '2026-03-31T23:59:59Z',
              isPublic: true,
              isOpen: true,
              maxAnswers: 1,
              isParticipationForm: true,
              answerableTags: [],
              confirmationMessage: 'ありがとうございました。'
            }
          })
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food/circles') && method === 'GET') {
          const pageSize = Number.parseInt(new URL(url, 'http://localhost').searchParams.get('pageSize') ?? '25', 10)
          return jsonResponse({
            items: Array.from({ length: Math.min(pageSize, 2) }, (_, index) => ({
              id: index === 0 ? 'circle-a' : 'circle-b',
              name: index === 0 ? '屋台企画A' : '屋台企画B',
              nameYomi: index === 0 ? 'ヤタイキカクエー' : 'ヤタイキカクビー',
              groupName: index === 0 ? 'Aブロック' : 'Bブロック',
              groupNameYomi: index === 0 ? 'エーブロック' : 'ビーブロック',
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
            })),
            page: 1,
            pageSize,
            total: 2
          })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffParticipationTypeCirclesPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()],
        stubs: {
          teleport: true
        }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('企画一覧')
    expect(wrapper.text()).toContain('参加種別を編集')
    expect(wrapper.text()).toContain('参加登録フォームの設定')
    expect(wrapper.text()).toContain('屋台企画A')
    expect(wrapper.text()).toContain('CSVで出力')
    expect(wrapper.text()).toContain('ファイルを一括ダウンロード')
    expect(wrapper.text()).toContain('絞り込み')

    const filterButton = wrapper.get('button[title="絞り込み"]')
    await filterButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('絞り込み条件')

    const emailLink = wrapper.get('a[title="メール送信"]')
    expect(emailLink.attributes('href')).toBe('/staff/circles/circle-a/email')

    const editTab = wrapper.findAll('a').find((link) => link.text().includes('参加種別を編集'))
    if (!editTab) {
      throw new Error('edit tab not found')
    }

    await editTab.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/staff/circles/participation_types/participation-type-food/edit')
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
