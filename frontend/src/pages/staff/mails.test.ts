import { describe, expect, it } from 'vitest'
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
  })
})
