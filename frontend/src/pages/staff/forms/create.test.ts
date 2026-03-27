import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffFormCreatePage from './create.vue'

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

describe('StaffFormCreatePage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('creates a staff form and navigates to editor', async () => {
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

    let createdRequestBody: Record<string, unknown> | null = null
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/forms', component: { template: '<div>forms</div>' } },
        { path: '/staff/forms/create', component: StaffFormCreatePage },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } }
      ]
    })
    await router.push('/staff/forms/create')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/forms') && method === 'POST') {
          createdRequestBody = await parseRequestBody(input, init?.body)
          return new Response(
            JSON.stringify({
              circle: {
                id: 'circle-b',
                name: 'デモ企画B'
              },
              id: 'form-generated-1',
              name: '追加ヒアリング',
              description: '当日の搬入担当者を確認します。',
              openAt: '2026-03-15T00:00:00Z',
              closeAt: '2026-03-30T09:45:00Z',
              maxAnswers: 3,
              answerableTags: ['展示', '必須'],
              confirmationMessage: '回答ありがとうございました。',
              isPublic: true,
              isOpen: true,
              createdAt: '2026-03-01T12:00:00Z',
              updatedAt: '2026-03-01T12:00:00Z',
              isParticipationForm: false
            }),
            {
              status: 201,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

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

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffFormCreatePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('select[name="circleId"]').setValue('circle-b')
    await wrapper.get('input[name="name"]').setValue('追加ヒアリング')
    await wrapper.get('textarea[name="description"]').setValue('当日の搬入担当者を確認します。')
    await wrapper.get('input[name="openAt"]').setValue('2026-03-15T09:00')
    await wrapper.get('input[name="closeAt"]').setValue('2026-03-30T18:45')
    await wrapper.get('input[name="maxAnswers"]').setValue('3')
    await wrapper.get('textarea[name="answerableTags"]').setValue('展示\n必須')
    await wrapper.get('textarea[name="confirmationMessage"]').setValue('回答ありがとうございました。')
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(createdRequestBody).toMatchObject({
      circleId: 'circle-b',
      maxAnswers: 3,
      answerableTags: ['展示', '必須'],
      confirmationMessage: '回答ありがとうございました。'
    })
    expect(String(createdRequestBody?.openAt)).toMatch(/^2026-03-15T/)
    expect(String(createdRequestBody?.closeAt)).toMatch(/^2026-03-30T/)
    expect(router.currentRoute.value.fullPath).toBe('/staff/forms/form-generated-1/editor')
  })
})

async function parseRequestBody(
  input: RequestInfo | URL,
  body: null | string | ArrayBuffer | Blob | FormData | URLSearchParams | ReadableStream<Uint8Array> | undefined
) {
  if (typeof body !== 'string') {
    if (typeof Request !== 'undefined' && input instanceof Request) {
      body = await input.clone().text()
    }
  }

  if (typeof body !== 'string') {
    throw new Error('Request body was not a string')
  }

  const parsed: unknown = JSON.parse(body)
  if (!isRecord(parsed)) {
    throw new Error('Request body was not an object')
  }

  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
