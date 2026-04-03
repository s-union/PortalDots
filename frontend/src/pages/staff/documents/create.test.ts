import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
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
    vi.unstubAllGlobals()
  })

  it('creates a staff document and resets form', async () => {
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

    let postReceived = false
    let receivedCircleId = ''
    let receivedName = ''
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/documents/create', component: StaffDocumentCreatePage },
        { path: '/staff/documents', component: { template: '<div>documents</div>' } }
      ]
    })
    await router.push('/staff/documents/create')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/circles/managed') && method === 'GET') {
          return new Response(
            JSON.stringify([
              {
                id: 'circle-b',
                name: 'デモ企画B'
              }
            ]),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/documents') && method === 'POST') {
          postReceived = true
          const body = await parseFormDataBody(input, init?.body)
          receivedCircleId = resolveTextEntry(body.get('circleId'))
          receivedName = resolveTextEntry(body.get('name'))
          return new Response(
            JSON.stringify({
              circle: {
                id: 'circle-b',
                name: 'デモ企画B'
              },
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
            }),
            {
              status: 201,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

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

async function parseFormDataBody(
  input: RequestInfo | URL,
  body: null | string | ArrayBuffer | Blob | FormData | URLSearchParams | ReadableStream<Uint8Array> | undefined
) {
  if (!(body instanceof FormData) && typeof Request !== 'undefined' && input instanceof Request) {
    body = await input.clone().formData()
  }

  if (!(body instanceof FormData)) {
    throw new Error('Request body was not FormData')
  }

  return body
}

function resolveTextEntry(entry: FormDataEntryValue | null) {
  return typeof entry === 'string' ? entry : ''
}
