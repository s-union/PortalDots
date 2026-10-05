import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
const publicHomeApiMocks = vi.hoisted(() => ({
  usePublicPagesQuery: vi.fn()
}))

vi.mock('@/features/public-home/api', () => ({
  usePublicPagesQuery: publicHomeApiMocks.usePublicPagesQuery
}))

import PublicPagesIndexPage from './index.vue'

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

describe('PublicPagesIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders guest pages', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    publicHomeApiMocks.usePublicPagesQuery.mockReturnValue({
      data: ref({
        items: [
          {
            id: 'page-1',
            title: 'お知らせサンプル',
            summary: '公開中のお知らせです。',
            createdAt: '2026-03-05T10:00:00Z',
            updatedAt: '2026-03-05T10:00:00Z',
            isLimited: false,
            isNew: true
          }
        ],
        page: 1,
        pageSize: 10,
        total: 1
      }),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/public/pages', component: PublicPagesIndexPage },
        { path: '/public/pages/:pageId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/public/pages')
    await router.isReady()

    const wrapper = mount(PublicPagesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('お知らせサンプル')
      expect(wrapper.text()).toContain('全員に公開')
      expect(wrapper.text()).toContain('NEW')
      expect(wrapper.text()).toContain('公開中のお知らせです。')
    })

    const [, requestedPage, requestedPageSize, requestedQuery] = publicHomeApiMocks.usePublicPagesQuery.mock.calls[0]
    expect(requestedPage.value).toBe(1)
    expect(requestedPageSize.value).toBe(10)
    expect(requestedQuery.value).toBe('')
  })

  it('shows the next page and updates the route when moving back', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    publicHomeApiMocks.usePublicPagesQuery.mockReset()
    publicHomeApiMocks.usePublicPagesQuery.mockReturnValue({
      data: ref({
        items: [
          {
            id: 'page-11',
            title: '11件目のお知らせ',
            summary: '2ページ目のお知らせです。',
            createdAt: '2026-03-05T10:00:00Z',
            updatedAt: '2026-03-05T10:00:00Z',
            isLimited: false,
            isNew: false
          }
        ],
        page: 2,
        pageSize: 10,
        total: 11
      }),
      isPending: ref(false)
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/public/pages', component: PublicPagesIndexPage },
        { path: '/public/pages/:pageId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/public/pages?page=2')
    await router.isReady()

    const wrapper = mount(PublicPagesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('11件目のお知らせ')
    expect(wrapper.text()).toContain('2 / 2')

    await wrapper.findAll('button')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.page).toBeUndefined()
    const [, requestedPage] = publicHomeApiMocks.usePublicPagesQuery.mock.calls[0]
    expect(requestedPage.value).toBe(1)
  })
})
