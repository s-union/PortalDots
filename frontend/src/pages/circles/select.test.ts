import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import CircleSelectorPage from './select.vue'
import WorkspacePage from '../workspace/index.vue'

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

function buildFetchMock() {
  let selected = false

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    await Promise.resolve()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

    const pathname = new URL(url, 'http://localhost').pathname

    if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
      return new Response(
        JSON.stringify({
          csrfToken: 'csrf-token',
          currentCircle: selected
            ? {
                id: 'circle-b',
                name: 'デモ企画B'
              }
            : null,
          featureFlags: [],
          roles: ['participant'],
          user: {
            id: 'demo-user',
            displayName: 'Demo User'
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (pathname.endsWith('/circles') && method === 'GET') {
      return new Response(
        JSON.stringify([
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
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (pathname.endsWith('/participation-types') && method === 'GET') {
      return new Response(
        JSON.stringify([
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
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (pathname.endsWith('/circles/current') && method === 'PUT') {
      selected = true
      return new Response(null, { status: 204 })
    }

    throw new Error(`Unexpected request: ${method} ${url}`)
  })
}

describe('CircleSelectorPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('selects a circle and navigates to the workspace', async () => {
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
        displayName: 'Demo User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/circles/select', component: CircleSelectorPage },
        { path: '/workspace', component: WorkspacePage }
      ]
    })
    await router.push('/circles/select')
    await router.isReady()

    const fetchMock = buildFetchMock()

    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('button[type="button"]:last-of-type').trigger('click')
    await flushPromises()

    expect(sessionStore.currentCircle?.name).toBe('デモ企画B')
    expect(router.currentRoute.value.path).toBe('/workspace')
  })

  it('returns to the requested page after selecting a circle', async () => {
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
        displayName: 'Demo User'
      }
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

    const fetchMock = buildFetchMock()

    vi.stubGlobal('fetch', fetchMock)

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
        displayName: 'Demo User'
      }
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

    const fetchMock = buildFetchMock()

    vi.stubGlobal('fetch', fetchMock)

    mount(CircleSelectorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/workspace/forms/form-1?answer=answer-1')
  })

  it('shows participation type cards linking to circle creation', async () => {
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
        displayName: 'Demo User'
      }
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

    vi.stubGlobal('fetch', buildFetchMock())

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
})
