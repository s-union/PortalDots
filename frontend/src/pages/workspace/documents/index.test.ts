import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import DocumentsIndexPage from './index.vue'

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

describe('DocumentsIndexPage', () => {
  it('renders documents for the current circle', async () => {
    server.use(
      http.get('/v1/documents', ({ request }) => {
        const url = new URL(request.url)
        const page = url.searchParams.get('page')
        const pageSize = url.searchParams.get('pageSize')
        if (page === '2' && pageSize === '10') {
          return HttpResponse.json({
            items: [
              {
                id: 'document-circle-b-1',
                name: '展示ガイド',
                description: 'Bブロック向けの展示ガイドです。',
                isImportant: true,
                isNew: true,
                extension: 'PDF',
                sizeBytes: 2048,
                updatedAt: '2026-03-05T09:00:00Z',
                downloadUrl: '/v1/documents/document-circle-b-1'
              }
            ],
            page: 2,
            pageSize: 10,
            total: 21
          })
        }
        return HttpResponse.json({ items: [], page: 1, pageSize: 10, total: 0 })
      })
    )

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
      roles: ['participant'],
      user: {
        id: 'demo-user',
        displayName: 'Demo User'
      }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workspace', component: { template: '<div>workspace</div>' } },
        { path: '/workspace/documents', component: DocumentsIndexPage },
        {
          path: '/workspace/documents/:documentId',
          component: { template: '<div>detail</div>' }
        }
      ]
    })
    await router.push('/workspace/documents?page=2')
    await router.isReady()

    const wrapper = mount(DocumentsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('展示ガイド')
    expect(wrapper.text()).toContain('PDFファイル')
    expect(wrapper.text()).toContain('NEW')
    expect(wrapper.text()).toContain('21 件中')
  })
})
