import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import PagesIndexPage from './index.vue'

const pagesApiMocks = vi.hoisted(() => ({
  usePagesQuery: vi.fn()
}))

vi.mock('@/features/pages/api', () => ({
  usePagesQuery: pagesApiMocks.usePagesQuery
}))

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

function createPagesRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/workspace', component: { template: '<div>workspace</div>' } },
      { path: '/workspace/pages', component: PagesIndexPage },
      { path: '/workspace/pages/:pageId', component: { template: '<div>detail</div>' } }
    ]
  })
}

describe('PagesIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders page badges and titles', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    pagesApiMocks.usePagesQuery.mockReturnValue({
      data: ref({
        items: [
          {
            id: 'page-circle-b-1',
            title: '展示レイアウト更新',
            summary: 'Bブロックの展示レイアウトを更新しました。',
            createdAt: '2026-03-03T09:00:00Z',
            updatedAt: '2026-03-03T09:00:00Z',
            isLimited: true,
            isNew: true,
            isUnread: true
          }
        ],
        page: 1,
        pageSize: 10,
        total: 1
      }),
      isPending: ref(false)
    })

    const router = createPagesRouter()
    await router.push('/workspace/pages')
    await router.isReady()

    const wrapper = mount(PagesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('展示レイアウト更新')
    expect(wrapper.text()).toContain('限定公開')
    expect(wrapper.text()).toContain('NEW')
    expect(wrapper.text()).toContain('未読')
    expect(wrapper.text()).toContain('Bブロックの展示レイアウトを更新しました。')
  })

  it('updates router query when searching', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    pagesApiMocks.usePagesQuery.mockReturnValue({
      data: ref({
        items: [],
        page: 1,
        pageSize: 10,
        total: 0
      }),
      isPending: ref(false)
    })

    const router = createPagesRouter()
    await router.push('/workspace/pages')
    await router.isReady()

    const wrapper = mount(PagesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[name="query"]').setValue('レイアウト')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(router.currentRoute.value.query.query).toBe('レイアウト')
  })
})
