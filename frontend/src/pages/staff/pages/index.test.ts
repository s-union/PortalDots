import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { resolveStaffPagePublishStatus } from '@/features/staff/pages/api'
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

const documentCircleB1 = {
  id: 'document-circle-b-1',
  name: '展示ガイド',
  description: 'Bブロック向けの展示ガイドです。',
  isImportant: true,
  extension: 'TXT',
  sizeBytes: 1024,
  updatedAt: '2026-03-05T09:00:00Z',
  downloadUrl: '/v1/documents/document-circle-b-1'
}

const pages = [
  {
    id: 'page-circle-b-z',
    title: '後続メモ',
    body: '次の案内です。',
    notes: '次の案内です。',
    createdAt: '2026-03-05T09:00:00Z',
    updatedAt: '2026-03-05T09:00:00Z',
    publishedAt: '2026-03-05T09:00:00Z',
    isPinned: false,
    isPublic: false,
    mailScheduled: false,
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
    publishedAt: '2026-03-04T09:00:00Z',
    isPinned: false,
    isPublic: false,
    mailScheduled: false,
    viewableTags: ['展示'],
    documentIds: ['document-circle-b-1'],
    documents: [documentCircleB1]
  },
  {
    id: 'page-circle-b-s',
    title: '予約公開メモ',
    body: '公開予定のお知らせです。',
    notes: '公開予定のお知らせです。',
    createdAt: '2026-03-06T09:00:00Z',
    updatedAt: '2026-03-06T09:00:00Z',
    publishedAt: '2099-01-15T10:00:00Z',
    isPinned: false,
    isPublic: true,
    mailScheduled: false,
    viewableTags: [],
    documentIds: [],
    documents: []
  },
  {
    id: 'page-circle-b-p',
    title: '公開済みメモ',
    body: '公開中のお知らせです。',
    notes: '公開中のお知らせです。',
    createdAt: '2026-03-07T09:00:00Z',
    updatedAt: '2026-03-07T09:00:00Z',
    publishedAt: '2026-03-07T09:00:00Z',
    isPinned: false,
    isPublic: true,
    mailScheduled: false,
    viewableTags: [],
    documentIds: [],
    documents: []
  }
]

describe('StaffPagesIndexPage', () => {
  it.each([
    [false, '2020-01-01T00:00:00Z', 'unpublished'],
    [false, '2099-01-01T00:00:00Z', 'unpublished'],
    [false, 'not-a-date', 'unpublished'],
    [true, '2020-01-01T00:00:00Z', 'published'],
    [true, '2099-01-01T00:00:00Z', 'scheduled'],
    [true, 'not-a-date', 'published']
  ] as const)('resolves publication status for isPublic=%s and publishedAt=%s', (isPublic, publishedAt, expected) => {
    expect(resolveStaffPagePublishStatus({ isPublic, publishedAt })).toBe(expected)
  })

  it('lists staff pages and shows create actions', async () => {
    server.use(
      http.get('/v1/staff/tags', () =>
        HttpResponse.json([
          { id: 'tag-exhibition', name: '展示' },
          { id: 'tag-stage', name: 'ステージ' }
        ])
      ),
      http.get('/v1/staff/documents', () =>
        HttpResponse.json([
          {
            circle: { id: 'circle-a', name: 'デモ企画A' },
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
            circle: { id: 'circle-b', name: 'デモ企画B' },
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
        ])
      ),
      http.get('/v1/staff/pages', () => HttpResponse.json(pages))
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
  })

  it('distinguishes unpublished, scheduled and published notices', async () => {
    server.use(
      http.get('/v1/staff/tags', () => HttpResponse.json([])),
      http.get('/v1/staff/documents', () => HttpResponse.json([])),
      http.get('/v1/staff/pages', () => HttpResponse.json(pages))
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
        { path: '/staff/pages', component: StaffPagesIndexPage },
        { path: '/staff/pages/create', component: { template: '<div>create</div>' } },
        { path: '/staff/pages/:pageId', component: { template: '<div>detail</div>' } }
      ]
    })
    await router.push('/staff/pages')
    await router.isReady()

    const wrapper = mount(StaffPagesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const headers = wrapper.findAll('thead th').map((header) => header.text().trim())
    const titleColumn = headers.indexOf('タイトル')
    const statusColumn = headers.indexOf('公開状態')
    const publishedAtColumn = headers.indexOf('公開日時')
    expect(titleColumn).toBeGreaterThanOrEqual(0)
    expect(statusColumn).toBeGreaterThanOrEqual(0)
    expect(publishedAtColumn).toBeGreaterThanOrEqual(0)

    const statusByTitle = Object.fromEntries(
      wrapper.findAll('tbody tr').map((row) => {
        const cells = row.findAll('td')
        return [cells[titleColumn].text(), cells[statusColumn].text()]
      })
    )
    const publishedAtByTitle = Object.fromEntries(
      wrapper.findAll('tbody tr').map((row) => {
        const cells = row.findAll('td')
        return [cells[titleColumn].text(), cells[publishedAtColumn].text()]
      })
    )

    expect(statusByTitle).toEqual({
      非公開メモ: '非公開',
      後続メモ: '非公開',
      予約公開メモ: '予約公開',
      公開済みメモ: '公開中'
    })
    expect(publishedAtByTitle['非公開メモ']).toBe('-')
    expect(publishedAtByTitle['後続メモ']).toBe('-')
  })
})
