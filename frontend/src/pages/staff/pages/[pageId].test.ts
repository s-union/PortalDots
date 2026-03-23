import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import StaffPageDetailPage from './[pageId].vue'

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

describe('StaffPageDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('updates, toggles pin, and deletes a staff page', async () => {
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
      roles: ['admin'],
      user: {
        id: 'staff-user',
        displayName: 'Staff User'
      }
    })

    let currentPinned = false
    let deleted = false

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/pages', component: { template: '<div>pages</div>' } },
        { path: '/staff/pages/:pageId', component: StaffPageDetailPage }
      ]
    })
    await router.push('/staff/pages/page-circle-b-1')
    await router.isReady()

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
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

        if (pathname.endsWith('/staff/pages/page-circle-b-1') && method === 'GET') {
          return new Response(
            JSON.stringify({
              id: 'page-circle-b-1',
              title: '展示担当向け連絡',
              body: '初期本文です。',
              notes: '内部メモです。',
              publishedAt: '2026-03-05T10:00:00Z',
              isPinned: currentPinned,
              isPublic: true,
              viewableTags: ['展示'],
              documentIds: ['document-circle-b-1'],
              documents: [
                {
                  id: 'document-circle-b-1',
                  name: '展示ガイド',
                  description: 'Bブロック向けの展示ガイドです。'
                }
              ]
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/pages/page-circle-b-1') && method === 'PUT') {
          return new Response(
            JSON.stringify({
              id: 'page-circle-b-1',
              title: '展示担当向け更新連絡',
              publishedAt: '2026-03-05T10:00:00Z',
              isPinned: currentPinned,
              isPublic: false
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/pages/page-circle-b-1/pin') && method === 'PATCH') {
          currentPinned = true
          return new Response(
            JSON.stringify({
              id: 'page-circle-b-1',
              title: '展示担当向け更新連絡',
              publishedAt: '2026-03-05T10:00:00Z',
              isPinned: true,
              isPublic: false
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/pages/page-circle-b-1') && method === 'DELETE') {
          deleted = true
          return new Response(null, { status: 204 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffPageDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()
    await flushPromises()

    expect(wrapper.get('input[name="title"]').element).toHaveProperty('value', '展示担当向け連絡')
    expect(wrapper.get('textarea[name="viewableTags"]').element).toHaveProperty('value', '展示')
    expect(wrapper.text()).toContain('展示ガイド')
    expect(wrapper.text()).toContain('保存時にモックメール配信を予約する')
    expect(wrapper.text()).toContain('予約された通知はモックキューに積まれ、実メールは送信しません。')

    await wrapper.get('input[name="title"]').setValue('展示担当向け更新連絡')
    await wrapper.get('textarea[name="body"]').setValue('更新後本文です。')
    await wrapper.get('textarea[name="notes"]').setValue('更新後メモです。')
    await wrapper.get('textarea[name="viewableTags"]').setValue('展示\nステージ')
    await wrapper.get('input[name="isPublic"]').setValue(false)
    await wrapper.get('input[name="sendEmails"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('お知らせを更新しました。')

    const buttons = wrapper.findAll('button[type="button"]')
    await buttons[1]?.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('お知らせを固定表示しました。')

    await buttons[0]?.trigger('click')
    await flushPromises()

    expect(deleted).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe('/staff/pages')
  })
})
