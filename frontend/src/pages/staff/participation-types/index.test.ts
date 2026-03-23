import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffParticipationTypesIndexPage from './index.vue'

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

describe('StaffParticipationTypesIndexPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists participation types, links to detail, and creates a new type', async () => {
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

    let created = false
    let createdRequestBody = ''

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/circles', component: { template: '<div>circles</div>' } },
        { path: '/staff/participation-types', component: StaffParticipationTypesIndexPage },
        {
          path: '/staff/participation-types/:typeId',
          component: { template: '<div>participation type detail</div>' }
        }
      ]
    })
    await router.push('/staff/participation-types')
    await router.isReady()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return jsonResponse({ allowed: true, authorized: true })
        }

        if (pathname.endsWith('/staff/participation-types') && method === 'GET') {
          return jsonResponse(
            created
              ? [
                  buildParticipationType({
                    id: 'participation-type-stage',
                    name: 'ステージ',
                    description: 'ステージ企画向けの参加種別です。',
                    usersCountMax: 8,
                    tags: ['ステージ', '音響']
                  }),
                  buildParticipationType(),
                  buildParticipationType({
                    id: 'participation-type-exhibit',
                    name: '展示',
                    description: '展示企画向けの参加種別です。',
                    tags: ['展示']
                  })
                ]
              : [
                  buildParticipationType(),
                  buildParticipationType({
                    id: 'participation-type-exhibit',
                    name: '展示',
                    description: '展示企画向けの参加種別です。',
                    tags: ['展示']
                  })
                ]
          )
        }

        if (pathname.endsWith('/staff/participation-types') && method === 'POST') {
          if (input instanceof Request) {
            createdRequestBody = await input.clone().text()
          } else if (typeof init?.body === 'string') {
            createdRequestBody = init.body
          }

          created = true
          return jsonResponse(
            buildParticipationType({
              id: 'participation-type-stage',
              name: 'ステージ',
              description: 'ステージ企画向けの参加種別です。',
              usersCountMax: 8,
              tags: ['ステージ', '音響']
            }),
            201
          )
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffParticipationTypesIndexPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('参加種別管理')
    expect(wrapper.text()).toContain('模擬店')
    expect(wrapper.text()).toContain('展示')
    expect(wrapper.get('a[href="/staff/participation-types/participation-type-food"]').text()).toContain('模擬店')

    await wrapper.get('input[name="name"]').setValue('ステージ')
    await wrapper.get('textarea[name="description"]').setValue('ステージ企画向けの参加種別です。')
    await wrapper.get('input[name="usersCountMin"]').setValue('2')
    await wrapper.get('input[name="usersCountMax"]').setValue('8')
    await wrapper.get('textarea[name="tags"]').setValue('ステージ\n音響')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createdRequestBody).toContain('ステージ')
    expect(createdRequestBody).toContain('音響')
    expect(wrapper.text()).toContain('ステージ')
    expect(wrapper.get('a[href="/staff/participation-types/participation-type-stage"]').text()).toContain('ステージ')
  })
})

function buildParticipationType(overrides: Partial<ReturnType<typeof baseParticipationType>> = {}) {
  return {
    ...baseParticipationType(),
    ...overrides,
    form: {
      ...baseParticipationType().form,
      ...overrides.form
    }
  }
}

function baseParticipationType() {
  return {
    id: 'participation-type-food',
    name: '模擬店',
    description: '模擬店向けの参加種別です。',
    usersCountMin: 1,
    usersCountMax: 4,
    tags: ['模擬店'],
    form: {
      id: 'form-participation-food',
      name: '企画参加登録',
      description: '参加登録を提出してください。',
      openAt: '2026-03-01T00:00:00Z',
      closeAt: '2026-03-31T23:59:59Z',
      isPublic: true,
      isOpen: true,
      maxAnswers: 1,
      answerableTags: [],
      confirmationMessage: 'ありがとうございました。'
    }
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
