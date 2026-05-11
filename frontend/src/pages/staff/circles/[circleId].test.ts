import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
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

const defaultMembers = [
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

const defaultCircle = {
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
}

const defaultParticipationTypes = [
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
]

const defaultPlaces = [
  { id: 'place-booth', name: '屋内ブース', maxCircleCount: 200 },
  { id: 'place-stage', name: 'メインステージ', maxCircleCount: 30 }
]

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
  it('renders and updates circle detail', async () => {
    server.use(
      http.get('/v1/staff/participation-types', () => HttpResponse.json(defaultParticipationTypes)),
      http.get('/v1/staff/places', () => HttpResponse.json(defaultPlaces)),
      http.get('/v1/staff/circles/circle-b', () => HttpResponse.json(defaultCircle)),
      http.get('/v1/staff/circles/circle-b/members', () => HttpResponse.json(defaultMembers)),
      http.get('/v1/staff/circles/circle-b/email', () =>
        HttpResponse.json({
          circle: defaultCircle,
          recipients: defaultMembers.map((m) => ({
            id: m.userId,
            displayName: m.displayName,
            loginIds: m.loginIds,
            isLeader: m.isLeader
          }))
        })
      ),
      http.put('/v1/staff/circles/circle-b', () =>
        HttpResponse.json({
          ...defaultCircle,
          name: '更新後の企画B',
          nameYomi: 'コウシンゴノキカクビー',
          groupName: '更新後Bブロック',
          groupNameYomi: 'コウシンゴビーブロック'
        })
      ),
      http.post('/v1/staff/circles/circle-b/email', () => HttpResponse.json({}, { status: 201 })),
      http.post('/v1/staff/circles/circle-b/members', () => new HttpResponse(null, { status: 201 })),
      http.delete('/v1/staff/circles/circle-b/members/user-2', () => new HttpResponse(null, { status: 204 }))
    )

    const pinia = setupSession()
    const router = await setupRouter()

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
    let memberAddWasCalled = false
    let memberDeleteWasCalled = false

    server.use(
      http.get('/v1/staff/participation-types', () => HttpResponse.json(defaultParticipationTypes)),
      http.get('/v1/staff/places', () => HttpResponse.json(defaultPlaces)),
      http.get('/v1/staff/circles/circle-b', () => HttpResponse.json(defaultCircle)),
      http.get('/v1/staff/circles/circle-b/members', () => HttpResponse.json(defaultMembers)),
      http.get('/v1/staff/circles/circle-b/email', () =>
        HttpResponse.json({
          circle: defaultCircle,
          recipients: defaultMembers.map((m) => ({
            id: m.userId,
            displayName: m.displayName,
            loginIds: m.loginIds,
            isLeader: m.isLeader
          }))
        })
      ),
      http.put('/v1/staff/circles/circle-b', () => HttpResponse.json(defaultCircle)),
      http.post('/v1/staff/circles/circle-b/email', () => HttpResponse.json({}, { status: 201 })),
      http.post('/v1/staff/circles/circle-b/members', () => {
        memberAddWasCalled = true
        return new HttpResponse(null, { status: 201 })
      }),
      http.delete('/v1/staff/circles/circle-b/members/user-2', () => {
        memberDeleteWasCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    const pinia = setupSession()
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
    const router = await setupRouter()

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

    expect(memberAddWasCalled).toBe(true)

    const deleteButtons = wrapper.findAll('button[type="button"]').filter((button) => button.text() === '削除')
    const deleteButton = deleteButtons.at(-1)
    if (!deleteButton) {
      throw new Error('delete member button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(memberDeleteWasCalled).toBe(true)
  })
})
