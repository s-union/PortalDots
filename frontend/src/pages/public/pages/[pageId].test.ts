import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
const publicHomeApiMocks = vi.hoisted(() => ({
  useSuspensePublicPageDetailQuery: vi.fn()
}))

vi.mock('@/features/public-home/api', () => ({
  useSuspensePublicPageDetailQuery: publicHomeApiMocks.useSuspensePublicPageDetailQuery
}))

import PublicPageDetailPage from './[pageId].vue'

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

describe('PublicPageDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders guest page detail', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    publicHomeApiMocks.useSuspensePublicPageDetailQuery.mockReturnValue({
      data: ref({
        id: 'page-1',
        title: 'お知らせサンプル',
        body: '本文です。',
        publishedAt: '2026-03-05T10:00:00Z',
        documents: [
          {
            id: 'document-1',
            name: 'サンプル配布資料',
            description: '資料の説明です。',
            isImportant: true,
            extension: 'PDF',
            sizeBytes: 1024,
            updatedAt: '2026-03-05T10:00:00Z',
            downloadUrl: '/v1/public/documents/document-1'
          }
        ]
      }),
      isPending: ref(false),
      suspense: vi.fn().mockResolvedValue(undefined)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/public/pages', component: { template: '<div>pages</div>' } },
        { path: '/public/pages/:pageId', component: PublicPageDetailPage }
      ]
    })
    await router.push('/public/pages/page-1')
    await router.isReady()

    const wrapper = mount(PublicPageDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('お知らせサンプル')
      expect(wrapper.text()).toContain('本文です。')
      expect(wrapper.text()).toContain('サンプル配布資料')
    })
  })
})
