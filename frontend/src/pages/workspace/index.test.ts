import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import WorkspacePage from './index.vue'
import { useSessionStore } from '@/features/session/store'

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
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    await Promise.resolve()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const pathname = new URL(url, 'http://localhost').pathname

    if (pathname.endsWith('/circles/current/detail') && method === 'GET') {
      return new Response(
        JSON.stringify({
          id: 'circle-a',
          name: 'デモ企画A',
          nameYomi: 'でもきかくえー',
          groupName: 'デモ大学',
          groupNameYomi: 'でもだいがく',
          participationTypeId: 'pt-exhibit',
          participationTypeName: '展示',
          formId: 'form-pt-exhibit',
          notes: '',
          leaderDisplayName: 'Demo User',
          canChangeGroupName: true,
          isLeader: true,
          lastUpdatedAt: '2026-03-20T00:00:00Z',
          usersCountMin: 1,
          usersCountMax: 4,
          memberCount: 2,
          canSubmit: true,
          formDescription: '',
          confirmationMessage: '',
          questions: [],
          answer: null,
          invitationToken: 'token-abc',
          submittedAt: null
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unexpected request: ${method} ${url}`)
  })
}

describe('WorkspacePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows registration status and workspace links', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-a',
        name: 'デモ企画A'
      },
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
        { path: '/workspace', component: WorkspacePage },
        { path: '/workspace/pages', component: { template: '<div>pages</div>' } },
        { path: '/workspace/documents', component: { template: '<div>documents</div>' } },
        { path: '/workspace/forms', component: { template: '<div>forms</div>' } },
        { path: '/workspace/contact', component: { template: '<div>contact</div>' } },
        { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
        { path: '/workspace/circles/confirm', component: { template: '<div>confirm</div>' } },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } },
        { path: '/circles/select', component: { template: '<div>circle selector</div>' } },
        { path: '/circles/new', component: { template: '<div>new circle</div>' } }
      ]
    })
    await router.push('/workspace')
    await router.isReady()

    vi.stubGlobal('fetch', buildFetchMock())

    const wrapper = mount(WorkspacePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/workspace')
    expect(wrapper.text()).toContain('デモ企画A')
    expect(wrapper.text()).toContain('参加登録は未提出です')
    expect(wrapper.text()).toContain('メンバーを確認する')
    expect(wrapper.text()).toContain('お問い合わせ')
  })

  it('hides new circle link for member-only users', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: {
        id: 'circle-a',
        name: 'デモ企画A'
      },
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
      routes: [
        { path: '/workspace', component: WorkspacePage },
        { path: '/workspace/pages', component: { template: '<div>pages</div>' } },
        { path: '/workspace/documents', component: { template: '<div>documents</div>' } },
        { path: '/workspace/forms', component: { template: '<div>forms</div>' } },
        { path: '/workspace/contact', component: { template: '<div>contact</div>' } },
        { path: '/workspace/settings', component: { template: '<div>settings</div>' } },
        { path: '/workspace/circles/confirm', component: { template: '<div>confirm</div>' } },
        { path: '/workspace/circles/members', component: { template: '<div>members</div>' } },
        { path: '/circles/select', component: { template: '<div>circle selector</div>' } },
        { path: '/circles/new', component: { template: '<div>new circle</div>' } }
      ]
    })
    await router.push('/workspace')
    await router.isReady()

    vi.stubGlobal('fetch', buildFetchMock())

    const wrapper = mount(WorkspacePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('企画を切り替える')
    expect(wrapper.text()).not.toContain('新しい企画を作成')
    expect(wrapper.find('a[href="/circles/new"]').exists()).toBe(false)
  })
})
