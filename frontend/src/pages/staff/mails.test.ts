import { describe, expect, it, vi } from 'vitest'
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

describe('StaffMailsPage', () => {
  it('lists queued mails and cancels all jobs', async () => {
    let hasQueuedMail = true
    server.use(
      http.get('/v1/staff/mails', () =>
        HttpResponse.json(
          hasQueuedMail
            ? [
                {
                  circle: { id: '', name: '共通' },
                  id: 'mail-job-1',
                  subject: '搬入のご案内',
                  body: '9:00 に集合してください。',
                  recipients: ['demo@example.com', 'sub@example.com'],
                  status: 'queued',
                  createdAt: '2026-03-12T00:00:00Z',
                  deliveredAt: ''
                }
              ]
            : []
        )
      ),
      http.delete('/v1/staff/mails', () => {
        hasQueuedMail = false
        return new HttpResponse(null, { status: 204 })
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
    expect(wrapper.text()).toContain('demo@example.com, sub@example.com')
    expect(wrapper.text()).toContain('送信依頼済み')
    expect(wrapper.text()).toContain('キューを全件キャンセル')

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )

    await wrapper.get('button[type="button"]').trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('メールキューはありません。')
  })
})
