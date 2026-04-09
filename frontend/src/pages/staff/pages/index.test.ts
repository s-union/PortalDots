import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffDashboardPage from '../index.vue'
import StaffPagesIndexPage from './index.vue'
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

describe('StaffPagesIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists staff pages and shows create actions', async () => {
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

    const createdTitle = ''
    const createdRequestBody: Record<string, unknown> | null = null
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/', component: { template: '<div>home</div>' } },
        { path: '/circles/select', component: { template: '<div>circles</div>' } },
        { path: '/staff', component: StaffDashboardPage },
        { path: '/staff/verify', component: StaffVerifyPage },
        { path: '/staff/pages', component: StaffPagesIndexPage },
        { path: '/staff/pages/create', component: { template: '<div>create</div>' } },
        { path: '/staff/pages/:pageId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/staff/pages')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/session/bootstrap') && method === 'GET') {
          return new Response(
            JSON.stringify({
              csrfToken: 'csrf-token',
              currentCircle: {
                id: 'circle-b',
                name: 'デモ企画B'
              },
              featureFlags: [],
              roles: ['admin'],
              user: {
                id: 'staff-user',
                displayName: 'Staff User'
              }
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return new Response(
            JSON.stringify({
              allowed: true,
              authorized: true
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/tags') && method === 'GET') {
          return new Response(
            JSON.stringify([
              { id: 'tag-exhibition', name: '展示' },
              { id: 'tag-stage', name: 'ステージ' }
            ]),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/documents') && method === 'GET') {
          return new Response(
            JSON.stringify([
              {
                circle: {
                  id: 'circle-a',
                  name: 'デモ企画A'
                },
                id: 'document-circle-a-1',
                name: 'A企画ガイド',
                description: 'Aブロック向けのガイドです。',
                notes: '',
                isImportant: false,
                filename: 'a-guide.txt',
                extension: 'TXT',
                mimeType: 'text/plain; charset=utf-8',
                sizeBytes: 768,
                isPublic: true,
                createdAt: '2026-03-02T09:00:00Z',
                updatedAt: '2026-03-04T09:00:00Z',
                downloadUrl: '/v1/documents/document-circle-a-1'
              },
              {
                circle: {
                  id: 'circle-b',
                  name: 'デモ企画B'
                },
                id: 'document-circle-b-1',
                name: '展示ガイド',
                description: 'Bブロック向けの展示ガイドです。',
                notes: '',
                isImportant: true,
                filename: 'b-exhibition-guide.txt',
                extension: 'TXT',
                mimeType: 'text/plain; charset=utf-8',
                sizeBytes: 1024,
                isPublic: true,
                createdAt: '2026-03-03T09:00:00Z',
                updatedAt: '2026-03-05T09:00:00Z',
                downloadUrl: '/v1/documents/document-circle-b-1'
              }
            ]),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (url.includes('/staff/pages?query=%E6%96%B0%E7%9D%80') && method === 'GET') {
          return new Response(
            JSON.stringify([
              {
                id: '0195ec00-00a3-7000-8000-000000000001',
                title: createdTitle,
                body: '新着本文です。',
                notes: '作成済みメモ',
                createdAt: '2026-03-12T00:00:00Z',
                updatedAt: '2026-03-12T00:00:00Z',
                isPinned: true,
                isPublic: true,
                viewableTags: ['展示'],
                documentIds: ['document-circle-b-1'],
                documents: [
                  {
                    id: 'document-circle-b-1',
                    name: '展示ガイド',
                    description: 'Bブロック向けの展示ガイドです。',
                    isImportant: true,
                    extension: 'TXT',
                    sizeBytes: 1024,
                    updatedAt: '2026-03-05T09:00:00Z',
                    downloadUrl: '/v1/documents/document-circle-b-1'
                  }
                ]
              }
            ]),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/pages') && method === 'GET') {
          const pages =
            createdTitle === ''
              ? [
                  {
                    id: 'page-circle-b-z',
                    title: '後続メモ',
                    body: '次の案内です。',
                    notes: '次の案内です。',
                    createdAt: '2026-03-05T09:00:00Z',
                    updatedAt: '2026-03-05T09:00:00Z',
                    isPinned: false,
                    isPublic: false,
                    viewableTags: [],
                    documentIds: [],
                    documents: []
                  },
                  {
                    id: 'page-circle-b-a',
                    title: '非公開メモ',
                    body: 'スタッフだけが確認するメモです。',
                    notes: 'スタッフだけが確認するメモです。',
                    createdAt: '2026-03-04T09:00:00Z',
                    updatedAt: '2026-03-04T09:00:00Z',
                    isPinned: false,
                    isPublic: false,
                    viewableTags: ['展示'],
                    documentIds: ['document-circle-b-1'],
                    documents: [
                      {
                        id: 'document-circle-b-1',
                        name: '展示ガイド',
                        description: 'Bブロック向けの展示ガイドです。',
                        isImportant: true,
                        extension: 'TXT',
                        sizeBytes: 1024,
                        updatedAt: '2026-03-05T09:00:00Z',
                        downloadUrl: '/v1/documents/document-circle-b-1'
                      }
                    ]
                  }
                ]
              : [
                  {
                    id: '0195ec00-00a3-7000-8000-000000000001',
                    title: createdTitle,
                    body: '新着本文です。',
                    notes: '作成済みメモ',
                    createdAt: '2026-03-12T00:00:00Z',
                    updatedAt: '2026-03-12T00:00:00Z',
                    isPinned: true,
                    isPublic: true,
                    viewableTags: ['展示'],
                    documentIds: ['document-circle-b-1'],
                    documents: [
                      {
                        id: 'document-circle-b-1',
                        name: '展示ガイド',
                        description: 'Bブロック向けの展示ガイドです。',
                        isImportant: true,
                        extension: 'TXT',
                        sizeBytes: 1024,
                        updatedAt: '2026-03-05T09:00:00Z',
                        downloadUrl: '/v1/documents/document-circle-b-1'
                      }
                    ]
                  },
                  {
                    id: 'page-circle-b-z',
                    title: '後続メモ',
                    body: '次の案内です。',
                    notes: '次の案内です。',
                    createdAt: '2026-03-05T09:00:00Z',
                    updatedAt: '2026-03-05T09:00:00Z',
                    isPinned: false,
                    isPublic: false,
                    viewableTags: [],
                    documentIds: [],
                    documents: []
                  },
                  {
                    id: 'page-circle-b-a',
                    title: '非公開メモ',
                    body: 'スタッフだけが確認するメモです。',
                    notes: 'スタッフだけが確認するメモです。',
                    createdAt: '2026-03-04T09:00:00Z',
                    updatedAt: '2026-03-04T09:00:00Z',
                    isPinned: false,
                    isPublic: false,
                    viewableTags: ['展示'],
                    documentIds: ['document-circle-b-1'],
                    documents: [
                      {
                        id: 'document-circle-b-1',
                        name: '展示ガイド',
                        description: 'Bブロック向けの展示ガイドです。',
                        isImportant: true,
                        extension: 'TXT',
                        sizeBytes: 1024,
                        updatedAt: '2026-03-05T09:00:00Z',
                        downloadUrl: '/v1/documents/document-circle-b-1'
                      }
                    ]
                  }
                ]

          return new Response(JSON.stringify(pages), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffPagesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('非公開メモ')
    expect(wrapper.text()).toContain('後続メモ')
    expect(wrapper.text()).toContain('お知らせID')
    expect(wrapper.text()).toContain('展示ガイド')
    expect(wrapper.text()).toContain('スタッフだけが確認するメモです。')
    expect(wrapper.get('a[href="/staff/pages/create"]').text()).toContain('新規お知らせ')

    expect(createdRequestBody).toBeNull()
  })
})
