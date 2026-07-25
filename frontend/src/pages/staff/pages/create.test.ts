import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffPageCreatePage from './create.vue'

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

async function mountCreatePage() {
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
      { path: '/staff/pages/create', component: StaffPageCreatePage },
      { path: '/staff/pages/:pageId', component: { template: '<div>detail</div>' } }
    ]
  })
  await router.push('/staff/pages/create')
  await router.isReady()

  const wrapper = mount(StaffPageCreatePage, {
    global: {
      plugins: [pinia, router, createQueryPlugin()]
    }
  })
  await flushPromises()

  return { router, wrapper }
}

const createdPage = {
  id: 'page-new',
  title: '新規お知らせ',
  body: '新規本文です。',
  notes: '',
  createdAt: '2026-03-05T10:00:00Z',
  updatedAt: '2026-03-05T10:00:00Z',
  publishedAt: '2099-01-15T10:00:00Z',
  isPinned: false,
  isPublic: true,
  viewableTags: [],
  documentIds: [],
  documents: []
}

describe('StaffPageCreatePage', () => {
  it('sends an RFC 3339 publishedAt when a publish time is scheduled', async () => {
    let createdRequestBody: Record<string, unknown> | null = null

    server.use(
      http.get('/v1/staff/tags', () => HttpResponse.json([])),
      http.get('/v1/staff/documents', () => HttpResponse.json([])),
      http.post('/v1/staff/pages', async ({ request }) => {
        createdRequestBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(createdPage)
      })
    )

    const { router, wrapper } = await mountCreatePage()

    await wrapper.get('input[name="title"]').setValue('新規お知らせ')
    await wrapper.get('textarea[name="body"]').setValue('新規本文です。')
    await wrapper.get('input[name="publishedAt"]').setValue('2099-01-15T19:00')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    expect(createdRequestBody).toMatchObject({ publishedAt: '2099-01-15T10:00:00Z' })
    expect(router.currentRoute.value.fullPath).toBe('/staff/pages/page-new')
  })

  it('sends a null publishedAt when no publish time is given', async () => {
    let createdRequestBody: Record<string, unknown> | null = null

    server.use(
      http.get('/v1/staff/tags', () => HttpResponse.json([])),
      http.get('/v1/staff/documents', () => HttpResponse.json([])),
      http.post('/v1/staff/pages', async ({ request }) => {
        createdRequestBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...createdPage, publishedAt: '2026-03-05T10:00:00Z' })
      })
    )

    const { wrapper } = await mountCreatePage()

    await wrapper.get('input[name="title"]').setValue('新規お知らせ')
    await wrapper.get('textarea[name="body"]').setValue('新規本文です。')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    expect(createdRequestBody).toMatchObject({ publishedAt: null })
  })
})
