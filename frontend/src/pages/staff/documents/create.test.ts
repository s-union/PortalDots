import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffDocumentCreatePage from './create.vue'

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

describe('StaffDocumentCreatePage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a staff document and resets form', async () => {
    let postReceived = false
    let receivedCircleId = ''
    let receivedName = ''

    server.use(
      http.get('/v1/staff/circles/managed', () => HttpResponse.json([{ id: 'circle-b', name: 'デモ企画B' }])),
      http.post('/v1/staff/documents', async ({ request }) => {
        postReceived = true
        const rawBody = await request.text()
        const circleIdMatch = rawBody.match(/name="circleId"\r?\n\r?\n([^\r\n]+)/)
        const nameMatch = rawBody.match(/name="name"\r?\n\r?\n([^\r\n]+)/)
        receivedCircleId = circleIdMatch?.[1] ?? ''
        receivedName = nameMatch?.[1] ?? ''
        return HttpResponse.json(
          {
            circle: { id: 'circle-b', name: 'デモ企画B' },
            id: '0195ec00-00a2-7000-8000-000000000001',
            name: '設営チェックシート',
            description: '当日の確認事項です。',
            notes: '設営責任者に配布します。',
            isImportant: true,
            filename: 'checklist.pdf',
            extension: 'PDF',
            mimeType: 'application/pdf',
            sizeBytes: 4096,
            isPublic: true,
            createdAt: '2026-03-06T09:00:00Z',
            updatedAt: '2026-03-06T09:00:00Z',
            downloadUrl: '/v1/staff/documents/0195ec00-00a2-7000-8000-000000000001'
          },
          { status: 201 }
        )
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
        { path: '/staff/documents/create', component: StaffDocumentCreatePage },
        { path: '/staff/documents', component: { template: '<div>documents</div>' } }
      ]
    })
    await router.push('/staff/documents/create')
    await router.isReady()

    const wrapper = mount(StaffDocumentCreatePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('select[name="circleId"]').setValue('circle-b')
    await wrapper.get('input[name="name"]').setValue('設営チェックシート')
    await wrapper.get('textarea[name="description"]').setValue('当日の確認事項です。')
    await wrapper.get('textarea[name="notes"]').setValue('設営責任者に配布します。')
    const fileInput = wrapper.get('input[name="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [new File(['pdf'], 'checklist.pdf', { type: 'application/pdf' })]
    })
    await fileInput.trigger('change')
    await wrapper.get('input[name="isImportant"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    expect(postReceived).toBe(true)
    expect(receivedCircleId).toBe('circle-b')
    expect(receivedName).toBe('設営チェックシート')
    expect(wrapper.text()).toContain('配布資料を作成しました。')

    const circleSelect = wrapper.get('select[name="circleId"]').element
    if (!(circleSelect instanceof HTMLSelectElement)) {
      throw new Error('circleId select was not HTMLSelectElement')
    }
    expect(circleSelect.value).toBe('')
    expect(wrapper.get('input[name="name"]').element).toHaveProperty('value', '')
  })
})
