import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import CircleSelectorPage from './select.vue'

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

const twoCircles = [
  {
    id: 'circle-a',
    name: 'デモ企画A',
    groupName: 'Aブロック',
    participationTypeName: '模擬店'
  },
  {
    id: 'circle-b',
    name: 'デモ企画B',
    groupName: 'Bブロック',
    participationTypeName: '展示'
  }
]

const twoParticipationTypes = [
  {
    id: 'pt-exhibit',
    name: '展示',
    description: '展示企画です',
    usersCountMin: 1,
    usersCountMax: 4,
    tags: [],
    form: {
      id: 'form-pt-exhibit',
      name: '参加登録',
      description: '',
      openAt: '2026-01-01T00:00:00Z',
      closeAt: '2026-12-31T23:59:59Z',
      isPublic: true,
      isOpen: true,
      maxAnswers: 1,
      answerableTags: [],
      confirmationMessage: ''
    }
  },
  {
    id: 'pt-food',
    name: '模擬店',
    description: '模擬店企画です',
    usersCountMin: 2,
    usersCountMax: 6,
    tags: [],
    form: {
      id: 'form-pt-food',
      name: '参加登録',
      description: '',
      openAt: '2026-01-01T00:00:00Z',
      closeAt: '2026-10-31T23:59:59Z',
      isPublic: true,
      isOpen: true,
      maxAnswers: 1,
      answerableTags: [],
      confirmationMessage: ''
    }
  }
]

describe('CircleSelectorPage', () => {
  it('selects a circle and navigates to the home page', async () => {
    let selected = false
    server.use(
      http.get('/v1/circles', () => HttpResponse.json(twoCircles)),
      http.get('/v1/participation-types', () => HttpResponse.json(twoParticipationTypes)),
      http.put('/v1/circles/current', () => {
        selected = true
        return new HttpResponse(null, { status: 204 })
      }),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: selected ? { id: 'circle-b', name: 'デモ企画B' } : null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: { id: 'demo-user', displayName: 'Demo User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/select', component: CircleSelectorPage },
        { path: '/', component: { template: '<div>home</div>' } }
      ]
    })
    await router.push('/circles/select')
    await router.isReady()

    const wrapper = mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('button[type="button"]:last-of-type').trigger('click')
    await flushPromises()

    expect(sessionStore.currentCircle?.name).toBe('デモ企画B')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('returns to the requested page after selecting a circle', async () => {
    let selected = false
    server.use(
      http.get('/v1/circles', () => HttpResponse.json(twoCircles)),
      http.get('/v1/participation-types', () => HttpResponse.json(twoParticipationTypes)),
      http.put('/v1/circles/current', () => {
        selected = true
        return new HttpResponse(null, { status: 204 })
      }),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: selected ? { id: 'circle-b', name: 'デモ企画B' } : null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: { id: 'demo-user', displayName: 'Demo User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/select', component: CircleSelectorPage },
        { path: '/workspace/forms/:formId', component: { template: '<div>form</div>' } }
      ]
    })
    await router.push('/circles/select?redirect=/workspace/forms/form-1%3Fanswer%3Danswer-1')
    await router.isReady()

    const wrapper = mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('元の画面へ戻ってそのまま作業を続けられます')

    await wrapper.get('button[type="button"]:last-of-type').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/workspace/forms/form-1?answer=answer-1')
  })

  it('auto-selects the requested circle for legacy selector-set redirects', async () => {
    let selected = false
    server.use(
      http.get('/v1/circles', () => HttpResponse.json(twoCircles)),
      http.get('/v1/participation-types', () => HttpResponse.json(twoParticipationTypes)),
      http.put('/v1/circles/current', () => {
        selected = true
        return new HttpResponse(null, { status: 204 })
      }),
      http.get('/v1/session/bootstrap', () =>
        HttpResponse.json({
          csrfToken: 'csrf-token',
          currentCircle: selected ? { id: 'circle-b', name: 'デモ企画B' } : null,
          featureFlags: [],
          roles: ['participant'],
          user: { id: 'demo-user', displayName: 'Demo User' }
        })
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: { id: 'demo-user', displayName: 'Demo User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/select', component: CircleSelectorPage },
        { path: '/workspace/forms/:formId', component: { template: '<div>form</div>' } }
      ]
    })
    await router.push('/circles/select?redirect=/workspace/forms/form-1%3Fanswer%3Danswer-1&circle=circle-b')
    await router.isReady()

    mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/workspace/forms/form-1?answer=answer-1')
  })

  it('shows default context message when no redirect is provided', async () => {
    server.use(
      http.get('/v1/circles', () => HttpResponse.json(twoCircles)),
      http.get('/v1/participation-types', () => HttpResponse.json(twoParticipationTypes))
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: { id: 'demo-user', displayName: 'Demo User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/circles/select', component: CircleSelectorPage }]
    })
    await router.push('/circles/select')
    await router.isReady()

    const wrapper = mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('ここで選んだ企画コンテキストで以後の画面が動きます。')
  })

  it('shows participation type cards linking to circle creation', async () => {
    server.use(
      http.get('/v1/circles', () => HttpResponse.json(twoCircles)),
      http.get('/v1/participation-types', () => HttpResponse.json(twoParticipationTypes))
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: { id: 'demo-user', displayName: 'Demo User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/select', component: CircleSelectorPage },
        { path: '/circles/new', component: { template: '<div>new</div>' } }
      ]
    })
    await router.push('/circles/select')
    await router.isReady()

    const wrapper = mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('別の企画を参加登録する')
    expect(wrapper.text()).toContain('展示企画です')
    expect(wrapper.text()).toContain('2027年1月1日(金) 08:59 まで受付')
    expect(wrapper.get('a[href="/circles/new?participation_type=pt-exhibit"]').text()).toContain('展示')
    expect(wrapper.get('a[href="/circles/new?participation_type=pt-food"]').text()).toContain('模擬店')
  })

  it('hides circle creation panel for member-only users', async () => {
    let participationTypesCalled = false
    server.use(
      http.get('/v1/circles', () => HttpResponse.json(twoCircles)),
      http.get('/v1/participation-types', () => {
        participationTypesCalled = true
        return HttpResponse.json(twoParticipationTypes)
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canCreateCircleRegistration: false
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/circles/select', component: CircleSelectorPage }]
    })
    await router.push('/circles/select')
    await router.isReady()

    const wrapper = mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('別の企画を参加登録する')
    expect(participationTypesCalled).toBe(false)
  })

  it('shows an empty message when no circles are selectable', async () => {
    server.use(http.get('/v1/circles', () => HttpResponse.json([])))

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User',
        canCreateCircleRegistration: false
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/circles/select', component: CircleSelectorPage }]
    })
    await router.push('/circles/select')
    await router.isReady()

    const wrapper = mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('該当する企画はありません。')
  })
})
