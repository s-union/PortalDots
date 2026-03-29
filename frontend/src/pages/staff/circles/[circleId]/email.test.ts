import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffCircleMailPage from './email.vue'

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
      { path: '/staff/circles/:circleId', component: { template: '<div>detail</div>' } },
      { path: '/staff/circles/:circleId/email', component: StaffCircleMailPage }
    ]
  })
  await router.push('/staff/circles/circle-b/email')
  await router.isReady()
  return router
}

function buildFetchMock(recipients = [{ id: 'user-1', displayName: '責任者A', loginIds: ['leader@example.com'] }]) {
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

    if (pathname.endsWith('/staff/circles/circle-b/email') && method === 'POST') {
      return new Response('{}', {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
      return new Response(
        JSON.stringify({
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

describe('StaffCircleMailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders and queues circle mail', async () => {
    const pinia = setupSession()
    const router = await setupRouter()
    vi.stubGlobal('fetch', buildFetchMock([{ id: 'user-1', displayName: '責任者A', loginIds: ['leader@example.com'] }]))

    const wrapper = mount(StaffCircleMailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('デモ企画B')
    expect(wrapper.text()).toContain('企画情報')
    expect(wrapper.text()).toContain('メール送信')
    expect(wrapper.text()).toContain('送信対象: 1 名')

    await wrapper.get('select[name="recipient"]').setValue('leader')
    await wrapper.get('input[name="subject"]').setValue('搬入のご案内')
    await wrapper.get('textarea[name="body"]').setValue('9:00 に集合してください。')

    const mailButton = wrapper.findAll('button').find((button) => button.text().includes('モックメールをキューに追加'))
    if (!mailButton) {
      throw new Error('mail button not found')
    }
    await mailButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('企画所属者向けモックメールをキューに追加しました。実メールは送信していません。')
    expect(wrapper.text()).toContain('責任者A')
    expect(wrapper.text()).toContain('Markdown 記法')
  })

  it('disables mail submission when there are no recipients', async () => {
    const pinia = setupSession()
    const router = await setupRouter()
    vi.stubGlobal('fetch', buildFetchMock([]))

    const wrapper = mount(StaffCircleMailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('宛先となる企画所属者がいないため、メールは送信できません。')
    const mailButton = wrapper.findAll('button').find((button) => button.text().includes('モックメールをキューに追加'))
    if (!mailButton) {
      throw new Error('mail button not found')
    }
    expect(mailButton.attributes('disabled')).toBeDefined()
  })
})
