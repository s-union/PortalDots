import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffCircleDetailPage from './[circleId]/index.vue'

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

interface StaffCircleMemberFixture {
  userId: string
  displayName: string
  loginIds: string[]
  isLeader: boolean
}

function buildStaffCircleDetailFetchMock(
  options: {
    members?: StaffCircleMemberFixture[]
    recipients?: { id: string; displayName: string; loginIds: string[] }[]
  } = {}
) {
  const members = options.members ?? [
    {
      userId: 'user-1',
      displayName: '責任者A',
      loginIds: ['leader@example.com'],
      isLeader: true
    },
    {
      userId: 'user-2',
      displayName: '構成員B',
      loginIds: ['member@example.com'],
      isLeader: false
    }
  ]
  const recipients =
    options.recipients ??
    members.map((member) => ({
      id: member.userId,
      displayName: member.displayName,
      loginIds: member.loginIds
    }))

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
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

    if (pathname.endsWith('/staff/places') && method === 'GET') {
      return new Response(
        JSON.stringify([
          { id: 'place-booth', name: '屋内ブース', maxCircleCount: 200 },
          { id: 'place-stage', name: 'メインステージ', maxCircleCount: 30 }
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (pathname.endsWith('/staff/circles/circle-b') && method === 'GET') {
      return new Response(
        JSON.stringify({
          id: 'circle-b',
          name: 'デモ企画B',
          nameYomi: 'デモキカクビー',
          groupName: 'Bブロック',
          groupNameYomi: 'ビーブロック',
          participationTypeId: 'participation-type-exhibit',
          participationTypeName: '展示',
          tags: ['展示'],
          notes: '既存メモ',
          submittedAt: '2025-02-01T00:00:00Z',
          status: 'pending',
          statusReason: '',
          statusSetAt: null,
          statusSetById: null,
          places: ['屋内ブース']
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (pathname.endsWith('/staff/circles/circle-b/members') && method === 'GET') {
      return new Response(JSON.stringify(members), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (pathname.endsWith('/staff/circles/circle-b/email') && method === 'GET') {
      return new Response(
        JSON.stringify({
          circle: {
            id: 'circle-b',
            name: 'デモ企画B',
            nameYomi: 'デモキカクビー',
            groupName: 'Bブロック',
            groupNameYomi: 'ビーブロック',
            participationTypeId: 'participation-type-exhibit',
            participationTypeName: '展示',
            tags: ['展示'],
            notes: '既存メモ',
            submittedAt: '2025-02-01T00:00:00Z',
            status: 'pending',
            statusReason: '',
            statusSetAt: null,
            statusSetById: null,
            places: ['屋内ブース']
          },
          recipients
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (pathname.endsWith('/staff/circles/circle-b') && method === 'PUT') {
      return new Response(
        JSON.stringify({
          id: 'circle-b',
          name: '更新後の企画B',
          nameYomi: 'コウシンゴノキカクビー',
          groupName: '更新後Bブロック',
          groupNameYomi: 'コウシンゴビーブロック',
          participationTypeId: 'participation-type-exhibit',
          participationTypeName: '展示',
          tags: ['展示'],
          notes: '既存メモ',
          submittedAt: '2025-02-01T00:00:00Z',
          status: 'pending',
          statusReason: '',
          statusSetAt: null,
          statusSetById: null,
          places: ['屋内ブース']
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (pathname.endsWith('/staff/circles/circle-b/email') && method === 'POST') {
      return new Response('{}', {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (pathname.endsWith('/staff/circles/circle-b/members') && method === 'POST') {
      return new Response(null, { status: 201 })
    }

    if (pathname.endsWith('/staff/circles/circle-b/members/user-2') && method === 'DELETE') {
      return new Response(null, { status: 204 })
    }

    if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
      return new Response(
        JSON.stringify({
          csrfToken: 'csrf-token',
          currentCircle: {
            id: 'circle-b',
            name: '更新後の企画B'
          },
          featureFlags: [],
          roles: ['admin'],
          permissions: ['staff.circles'],
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
}

function setupSession() {
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
  return pinia
}

async function setupRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/staff/circles', component: { template: '<div>circles</div>' } },
      { path: '/staff/circles/:circleId', component: StaffCircleDetailPage },
      { path: '/staff/circles/:circleId/email', component: { template: '<div>mail</div>' } },
      {
        path: '/staff/circles/participation_types/:typeId',
        component: { template: '<div>type</div>' }
      }
    ]
  })
  await router.push('/staff/circles/circle-b')
  await router.isReady()
  return router
}

describe('StaffCircleDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders and updates circle detail', async () => {
    const pinia = setupSession()
    const router = await setupRouter()
    vi.stubGlobal('fetch', buildStaffCircleDetailFetchMock())

    const wrapper = mount(StaffCircleDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('デモ企画B')
    expect(wrapper.text()).toContain('参加種別を開く')
    expect(wrapper.text()).toContain('企画所属者')
    expect(wrapper.text()).toContain('責任者A')
    expect(wrapper.text()).toContain('構成員B')
    expect(wrapper.text()).toContain('企画情報')
    expect(wrapper.text()).toContain('メール送信')

    await wrapper.get('input[name="name"]').setValue('更新後の企画B')
    await wrapper.get('input[name="nameYomi"]').setValue('こうしんごのきかくびー')
    await wrapper.get('input[name="groupName"]').setValue('更新後Bブロック')
    await wrapper.get('input[name="groupNameYomi"]').setValue('こうしんごびーぶろっく')
    await wrapper.findAll('form')[0].trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('企画を更新しました。')
    expect(wrapper.text()).toContain('既存企画の参加種別は変更できません。')
  })

  it('adds and removes circle members', async () => {
    const pinia = setupSession()
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
    const router = await setupRouter()
    const fetchMock = buildStaffCircleDetailFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(StaffCircleDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[name="memberLoginId"]').setValue('24a0000')
    const addMemberForm = wrapper.findAll('form')[1]
    if (!addMemberForm) {
      throw new Error('add member form not found')
    }
    await addMemberForm.trigger('submit')
    await flushPromises()

    expect(
      fetchMock.mock.calls.some(([input, init]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
        return method === 'POST' && new URL(url, 'http://localhost').pathname === '/v1/staff/circles/circle-b/members'
      })
    ).toBe(true)

    const deleteButtons = wrapper.findAll('button[type="button"]').filter((button) => button.text() === '削除')
    const deleteButton = deleteButtons.at(-1)
    if (!deleteButton) {
      throw new Error('delete member button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(
      fetchMock.mock.calls.some(([input, init]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
        return (
          method === 'DELETE' &&
          new URL(url, 'http://localhost').pathname === '/v1/staff/circles/circle-b/members/user-2'
        )
      })
    ).toBe(true)
  })
})
