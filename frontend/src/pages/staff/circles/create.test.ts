import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffCircleCreatePage from './create.vue'

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

const participationTypes = [
  {
    id: 'type-1',
    name: '模擬店',
    description: '模擬店の参加種別です。',
    usersCountMin: 1,
    usersCountMax: 10,
    tags: [],
    form: {
      id: 'form-1',
      name: '参加登録フォーム',
      description: '',
      openAt: '2026-03-01T00:00:00Z',
      closeAt: '2026-04-01T00:00:00Z',
      isPublic: true,
      isOpen: true,
      maxAnswers: 1,
      answerableTags: [],
      confirmationMessage: ''
    }
  }
]

const places = [
  {
    id: 'place-1',
    name: 'Aブロック',
    type: 0,
    notes: ''
  }
]

describe('StaffCircleCreatePage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a circle and navigates to its detail page', async () => {
    let postReceived = false

    server.use(
      http.get('/v1/staff/participation-types', () => HttpResponse.json(participationTypes)),
      http.get('/v1/staff/places', () => HttpResponse.json(places)),
      http.post('/v1/staff/circles', async ({ request }) => {
        postReceived = true
        const body = (await request.json()) as { name?: string }
        return HttpResponse.json(
          {
            id: 'circle-new',
            name: body.name ?? '',
            nameYomi: 'デモキカク',
            groupName: 'デモ団体',
            groupNameYomi: 'デモダンタイ',
            participationTypeId: 'type-1',
            participationTypeName: '模擬店',
            tags: [],
            notes: '',
            submittedAt: null,
            status: 'pending',
            statusReason: '',
            statusSetAt: null,
            statusSetById: null,
            places: ['place-1']
          },
          { status: 201 }
        )
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
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/circles/create', component: StaffCircleCreatePage },
        { path: '/staff/circles/:circleId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/staff/circles/create')
    await router.isReady()

    const wrapper = mount(StaffCircleCreatePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[name="name"]').setValue('デモ企画')
    await wrapper.get('input[name="nameYomi"]').setValue('デモキカク')
    await wrapper.get('input[name="groupName"]').setValue('デモ団体')
    await wrapper.get('input[name="groupNameYomi"]').setValue('デモダンタイ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(postReceived).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe('/staff/circles/circle-new')
  })

  it('does not redirect when the create fails', async () => {
    server.use(
      http.get('/v1/staff/participation-types', () => HttpResponse.json(participationTypes)),
      http.get('/v1/staff/places', () => HttpResponse.json(places)),
      http.post('/v1/staff/circles', () =>
        HttpResponse.json(
          {
            message: '入力内容を確認してください。',
            errors: { name: ['企画名は必須です'] }
          },
          { status: 422 }
        )
      )
    )

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
        { path: '/staff/circles/create', component: StaffCircleCreatePage },
        { path: '/staff/circles/:circleId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/staff/circles/create')
    await router.isReady()

    const wrapper = mount(StaffCircleCreatePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[name="name"]').setValue('デモ企画')
    await wrapper.get('input[name="nameYomi"]').setValue('デモキカク')
    await wrapper.get('input[name="groupName"]').setValue('デモ団体')
    await wrapper.get('input[name="groupNameYomi"]').setValue('デモダンタイ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('企画名は必須です')
    expect(router.currentRoute.value.fullPath).toBe('/staff/circles/create')
  })
})
