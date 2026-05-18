import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
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

const twoParticipationTypes = [
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

describe('StaffCirclesIndexPage', () => {
  it('shows participation type links', async () => {
    server.use(http.get('/v1/staff/participation-types', () => HttpResponse.json(twoParticipationTypes)))

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      permissions: ['staff.circles'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/circles', component: StaffCirclesIndexPage },
        { path: '/staff/circles/:circleId', component: { template: '<div>detail</div>' } },
        { path: '/staff/circles/participation_types/:typeId', component: { template: '<div>type detail</div>' } },
        { path: '/staff/circles/all', component: { template: '<div>all circles</div>' } },
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } }
      ]
    })
    await router.push('/staff/circles')
    await router.isReady()

    const wrapper = mount(StaffCirclesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('参加種別')
    expect(wrapper.text()).toContain('模擬店')
    expect(wrapper.text()).toContain('展示')
    expect(wrapper.text()).toContain('受付期間 : 2025年1月10日(金) 09:00〜2025年2月10日(月) 09:00')
    expect(wrapper.get('a[href="/staff/circles/participation_types/participation-type-food"]').text()).toContain(
      '模擬店'
    )
  })

  it('allows circle readers to open the page without participation type management links', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: [],
      permissions: ['staff.circles.read'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/circles', component: StaffCirclesIndexPage },
        { path: '/staff/circles/all', component: { template: '<div>all circles</div>' } },
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } }
      ]
    })
    await router.push('/staff/circles')
    await router.isReady()

    const wrapper = mount(StaffCirclesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('参加種別')
    expect(wrapper.get('a[href="/staff/circles/all"]').text()).toContain('すべての企画を表示')
    expect(wrapper.text()).not.toContain('受付期間 :')
    expect(wrapper.find('a[href="/staff/circles/participation_types"]').exists()).toBe(false)
  })
})
