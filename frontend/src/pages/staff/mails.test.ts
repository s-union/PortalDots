import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffMailsPage from './mails.vue'

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

async function mountHistoryPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  useSessionStore().hydrate({
    csrfToken: 'csrf-token',
    currentCircle: null,
    featureFlags: [],
    roles: ['admin'],
    user: { id: 'staff-user', displayName: 'Staff User' }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/staff', component: { template: '<div>staff</div>' } },
      { path: '/staff/pages', component: { template: '<div>pages</div>' } },
      { path: '/staff/mails', component: StaffMailsPage }
    ]
  })
  await router.push('/staff/mails')
  await router.isReady()
  const wrapper = mount(StaffMailsPage, { global: { plugins: [pinia, router, createQueryPlugin()] } })
  await flushPromises()
  return wrapper
}

afterEach(() => vi.unstubAllGlobals())

describe('StaffMailsPage', () => {
  it('lists delivery history without exposing queue purge controls', async () => {
    server.use(
      http.get('/v1/staff/mails', () =>
        HttpResponse.json([
          {
            jobId: 'mail-job-1',
            template: 'markdown-notice',
            priority: 'normal',
            subject: '搬入のご案内',
            body: '9:00 に集合してください。',
            recipients: ['demo@example.com', 'sub@example.com'],
            createdAt: '2026-03-12T00:00:00Z'
          }
        ])
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
        { path: '/staff', component: { template: '<div>staff</div>' } },
        { path: '/staff/pages', component: { template: '<div>pages</div>' } },
        { path: '/staff/mails', component: StaffMailsPage }
      ]
    })
    await router.push('/staff/mails')
    await router.isReady()

    const wrapper = mount(StaffMailsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('搬入のご案内')
    expect(wrapper.text()).toContain('9:00 に集合してください。')
    expect(wrapper.text()).toContain('demo@example.com, sub@example.com')
    expect(wrapper.text()).not.toContain('キャンセル')
    wrapper.unmount()
  })

  it('offers a retry when the initial history request fails', async () => {
    let requests = 0
    server.use(
      http.get('/v1/staff/mails', () => {
        requests += 1
        if (requests === 1) {
          return new HttpResponse(null, { status: 500 })
        }
        return HttpResponse.json([
          {
            jobId: 'mail-job-recovered',
            template: 'markdown-notice',
            priority: 'normal',
            subject: '復旧後の配信',
            body: '再取得できました。',
            recipients: ['demo@example.com'],
            createdAt: '2026-03-12T00:00:00Z'
          }
        ])
      })
    )

    const wrapper = await mountHistoryPage()
    try {
      await vi.waitFor(() => expect(wrapper.text()).toContain('配信履歴を取得できませんでした。'))
      expect(wrapper.findAll('article')).toHaveLength(0)

      const retry = wrapper.findAll('button').find((button) => button.text() === '再読み込み')
      expect(retry).toBeDefined()
      await retry?.trigger('click')

      await vi.waitFor(() => expect(wrapper.find('article h3').text()).toBe('復旧後の配信'))
      expect(requests).toBe(2)
    } finally {
      wrapper.unmount()
    }
  })

  it('appends older cards only when the history end approaches the viewport and keeps them after a retry', async () => {
    let onIntersect: (() => void) | undefined
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          onIntersect = () => callback([{ isIntersecting: true }])
        }
        observe() {}
        disconnect = disconnect
      }
    )
    const cursors: (string | null)[] = []
    let failNext = true
    const mail = (id: string) => ({
      jobId: id,
      template: 'markdown-notice',
      priority: 'normal',
      subject: id,
      body: '本文を省略せず表示',
      recipients: ['demo@example.com'],
      createdAt: '2026-03-12T00:00:00Z'
    })
    server.use(
      http.get('/v1/staff/mails', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('limit')).toBe('50')
        const cursor = url.searchParams.get('cursor')
        cursors.push(cursor)
        if (!cursor) return HttpResponse.json([mail('最新の配信')], { headers: { 'X-Next-Cursor': 'older-cursor' } })
        expect(cursor).toBe('older-cursor')
        if (failNext) {
          failNext = false
          return new HttpResponse(null, { status: 500 })
        }
        return HttpResponse.json([mail('過去の配信')])
      })
    )
    const wrapper = await mountHistoryPage()
    try {
      await vi.waitFor(() => expect(wrapper.findAll('article')).toHaveLength(1))
      expect(cursors).toEqual([null])
      expect(wrapper.text()).not.toContain('続きを表示')
      expect(onIntersect).toBeDefined()
      onIntersect?.()
      onIntersect?.()
      await vi.waitFor(() => expect(wrapper.text()).toContain('再読み込み'))
      expect(wrapper.text()).toContain('最新の配信')
      expect(cursors).toEqual([null, 'older-cursor'])
      const retry = wrapper.findAll('button').find((button) => button.text() === '再読み込み')
      expect(retry).toBeDefined()
      await retry?.trigger('click')
      await vi.waitFor(() => expect(wrapper.findAll('article')).toHaveLength(2))
      expect(wrapper.findAll('article').map((item) => item.find('h3').text())).toEqual(['最新の配信', '過去の配信'])
      expect(wrapper.text()).not.toContain('再読み込み')
      expect(wrapper.text()).not.toContain('続きを表示')
      expect(cursors).toEqual([null, 'older-cursor', 'older-cursor'])
    } finally {
      wrapper.unmount()
    }
    expect(disconnect).toHaveBeenCalled()
  })
})
