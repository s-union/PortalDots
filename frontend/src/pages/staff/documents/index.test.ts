import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffDashboardPage from '../index.vue'
import StaffDocumentDetailPage from './[documentId]/edit.vue'
import StaffDocumentsIndexPage from './index.vue'
import StaffVerifyPage from '../verify.vue'

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

describe('StaffDocumentsIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists and uploads staff documents', async () => {
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

    let uploaded = false
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/circles/select', component: { template: '<div>circles</div>' } },
        { path: '/staff', component: StaffDashboardPage },
        { path: '/staff/verify', component: StaffVerifyPage },
        { path: '/staff/documents', component: StaffDocumentsIndexPage },
        { path: '/staff/documents/:documentId/edit', component: StaffDocumentDetailPage }
      ]
    })
    await router.push('/staff/documents')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return new Response(JSON.stringify({ allowed: true, authorized: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }

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

        if (pathname.endsWith('/staff/documents') && method === 'GET') {
          const documents = uploaded
            ? [
                {
                  circle: {
                    id: 'circle-b',
                    name: 'デモ企画B'
                  },
                  id: 'document-generated-1',
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
                  downloadUrl: '/v1/staff/documents/document-generated-1'
                },
                {
                  circle: {
                    id: 'circle-b',
                    name: 'デモ企画B'
                  },
                  id: 'document-circle-b-private',
                  name: '内部メモ',
                  description: '非公開資料',
                  notes: 'スタッフ内のみ',
                  isImportant: false,
                  filename: 'private.txt',
                  extension: 'TXT',
                  mimeType: 'text/plain',
                  sizeBytes: 128,
                  isPublic: false,
                  createdAt: '2026-03-04T09:00:00Z',
                  updatedAt: '2026-03-04T09:00:00Z',
                  downloadUrl: '/v1/staff/documents/document-circle-b-private'
                },
                {
                  circle: {
                    id: 'circle-b',
                    name: 'デモ企画B'
                  },
                  id: 'document-circle-b-checklist',
                  name: 'チェック事項',
                  description: '事前確認用',
                  notes: '先に確認',
                  isImportant: false,
                  filename: 'check.txt',
                  extension: 'TXT',
                  mimeType: 'text/plain',
                  sizeBytes: 256,
                  isPublic: true,
                  createdAt: '2026-03-03T09:00:00Z',
                  updatedAt: '2026-03-03T09:00:00Z',
                  downloadUrl: '/v1/staff/documents/document-circle-b-checklist'
                }
              ]
            : [
                {
                  circle: {
                    id: 'circle-b',
                    name: 'デモ企画B'
                  },
                  id: 'document-circle-b-private',
                  name: '内部メモ',
                  description: '非公開資料',
                  notes: 'スタッフ内のみ',
                  isImportant: false,
                  filename: 'private.txt',
                  extension: 'TXT',
                  mimeType: 'text/plain',
                  sizeBytes: 128,
                  isPublic: false,
                  createdAt: '2026-03-04T09:00:00Z',
                  updatedAt: '2026-03-04T09:00:00Z',
                  downloadUrl: '/v1/staff/documents/document-circle-b-private'
                },
                {
                  circle: {
                    id: 'circle-b',
                    name: 'デモ企画B'
                  },
                  id: 'document-circle-b-checklist',
                  name: 'チェック事項',
                  description: '事前確認用',
                  notes: '先に確認',
                  isImportant: false,
                  filename: 'check.txt',
                  extension: 'TXT',
                  mimeType: 'text/plain',
                  sizeBytes: 256,
                  isPublic: true,
                  createdAt: '2026-03-03T09:00:00Z',
                  updatedAt: '2026-03-03T09:00:00Z',
                  downloadUrl: '/v1/staff/documents/document-circle-b-checklist'
                }
              ]

          return new Response(JSON.stringify(documents), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        if (pathname.endsWith('/staff/documents') && method === 'POST') {
          uploaded = true
          return new Response(
            JSON.stringify({
              circle: {
                id: 'circle-b',
                name: 'デモ企画B'
              },
              id: 'document-generated-1',
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
              downloadUrl: '/v1/staff/documents/document-generated-1'
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

    const wrapper = mount(StaffDocumentsIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('内部メモ')
    expect(wrapper.text()).toContain('チェック事項')
    expect(wrapper.text()).not.toContain('配布資料ID')
    expect(wrapper.text().indexOf('チェック事項')).toBeLessThan(wrapper.text().indexOf('内部メモ'))

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

    expect(wrapper.text()).toContain('設営チェックシート')
    expect(wrapper.text()).toContain('checklist.pdf')
    expect(wrapper.text()).toContain('設営責任者に配布します。')
  })
})
