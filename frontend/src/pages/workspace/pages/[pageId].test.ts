import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import PageDetailPage from './[pageId].vue'

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

describe('PageDetailPage', () => {
  it('renders the selected page detail', async () => {
    server.use(
      http.get('/v1/pages/:pageId', () =>
        HttpResponse.json({
          id: 'page-circle-a-1',
          title: '搬入時間のお知らせ',
          body: 'Aブロックの搬入は 9:00 から開始します。',
          isLimited: false,
          createdAt: '2026-03-01T09:00:00Z',
          updatedAt: '2026-03-01T09:00:00Z',
          documents: [
            {
              id: 'document-circle-a-1',
              name: '搬入手順書',
              description: 'Aブロック向けの搬入手順です。',
              isImportant: true,
              extension: 'TXT',
              sizeBytes: 1024,
              updatedAt: '2026-03-02T09:00:00Z',
              downloadUrl: '/v1/documents/document-circle-a-1'
            }
          ]
        })
      )
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-a', name: 'デモ企画A' },
      featureFlags: [],
      roles: ['participant'],
      user: { id: 'demo-user', displayName: 'Demo User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace/pages', component: { template: '<div>pages</div>' } },
        { path: '/workspace/pages/:pageId', component: PageDetailPage },
        {
          path: '/workspace/documents/:documentId',
          component: { template: '<div>document</div>' }
        }
      ]
    })
    await router.push('/workspace/pages/page-circle-a-1')
    await router.isReady()

    const wrapper = mount(PageDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('搬入時間のお知らせ')

    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('Aブロックの搬入は 9:00 から開始します。')
      },
      { timeout: 5000 }
    )

    expect(wrapper.text()).toContain('搬入手順書')
  })
})
