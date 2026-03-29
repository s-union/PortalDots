import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { buildDeleteStaffParticipationTypeConfirmMessage } from '@/features/staff/participation-types/api'
import StaffParticipationTypeEditPage from './edit.vue'

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

describe('StaffParticipationTypeEditPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows tab strip and updates participation type basic settings', async () => {
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

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } },
        { path: '/staff/circles/participation_types/:typeId', component: { template: '<div>circles tab</div>' } },
        { path: '/staff/circles/participation_types/:typeId/edit', component: StaffParticipationTypeEditPage },
        { path: '/staff/circles/participation_types/:typeId/form/edit', component: { template: '<div>form tab</div>' } }
      ]
    })
    await router.push('/staff/circles/participation_types/participation-type-food/edit')
    await router.isReady()

    let updatedRequestBody = ''

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

        if (pathname.endsWith('/staff/tags') && method === 'GET') {
          return jsonResponse([
            { id: 'tag-food', name: '模擬店' },
            { id: 'tag-outdoor', name: '屋外' }
          ])
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'GET') {
          return jsonResponse(participationTypeResponse())
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'PUT') {
          if (input instanceof Request) {
            updatedRequestBody = await input.clone().text()
          } else if (typeof init?.body === 'string') {
            updatedRequestBody = init.body
          }
          return jsonResponse({
            id: 'participation-type-food',
            name: '更新後模擬店',
            description: '更新後説明',
            usersCountMin: 1,
            usersCountMax: 5,
            tags: ['模擬店', '屋外'],
            form: {
              id: 'form-participation-food',
              name: '企画参加登録',
              description: '参加登録を提出してください。',
              openAt: '2026-03-01T00:00:00Z',
              closeAt: '2026-03-31T23:59:59Z',
              isPublic: true,
              isOpen: true,
              maxAnswers: 1,
              isParticipationForm: true,
              answerableTags: [],
              confirmationMessage: 'ありがとうございました。'
            }
          })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffParticipationTypeEditPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('企画一覧')
    expect(wrapper.text()).toContain('参加種別を編集')
    expect(wrapper.text()).toContain('参加登録フォームの設定')

    await wrapper.get('input[name="name"]').setValue('更新後模擬店')
    await wrapper.get('textarea[name="description"]').setValue('更新後説明')
    await wrapper.get('input[name="tags"]').setValue('屋')
    const outdoorTagButton = wrapper.findAll('button').find((button) => button.text() === '屋外')
    if (!outdoorTagButton) {
      throw new Error('outdoor tag button not found')
    }
    await outdoorTagButton.trigger('click')
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(updatedRequestBody).toContain('更新後模擬店')
    expect(updatedRequestBody).toContain('更新後説明')
    expect(updatedRequestBody).toContain('屋外')
    expect(wrapper.text()).toContain('参加種別を更新しました。')
  })

  it('deletes participation type after confirmation', async () => {
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

    const confirmMock = vi.fn(() => true)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } },
        { path: '/staff/circles/participation_types/:typeId', component: { template: '<div>circles tab</div>' } },
        { path: '/staff/circles/participation_types/:typeId/edit', component: StaffParticipationTypeEditPage },
        { path: '/staff/circles/participation_types/:typeId/form/edit', component: { template: '<div>form tab</div>' } }
      ]
    })
    await router.push('/staff/circles/participation_types/participation-type-food/edit')
    await router.isReady()

    let deleted = false

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

        if (pathname.endsWith('/staff/tags') && method === 'GET') {
          return jsonResponse([{ id: 'tag-food', name: '模擬店' }])
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'GET') {
          return jsonResponse(participationTypeResponse())
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'DELETE') {
          deleted = true
          return new Response(null, { status: 204 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffParticipationTypeEditPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const deleteButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes('参加種別を削除'))
    if (!deleteButton) {
      throw new Error('delete button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith(buildDeleteStaffParticipationTypeConfirmMessage())
    expect(deleted).toBe(true)
    expect(router.currentRoute.value.path).toBe('/staff/circles/participation_types')
  })

  it('does not delete participation type when confirmation is cancelled', async () => {
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

    const confirmMock = vi.fn(() => false)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/circles/participation_types', component: { template: '<div>types</div>' } },
        { path: '/staff/circles/participation_types/:typeId', component: { template: '<div>circles tab</div>' } },
        { path: '/staff/circles/participation_types/:typeId/edit', component: StaffParticipationTypeEditPage },
        { path: '/staff/circles/participation_types/:typeId/form/edit', component: { template: '<div>form tab</div>' } }
      ]
    })
    await router.push('/staff/circles/participation_types/participation-type-food/edit')
    await router.isReady()

    let deleted = false

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

        if (pathname.endsWith('/staff/tags') && method === 'GET') {
          return jsonResponse([{ id: 'tag-food', name: '模擬店' }])
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'GET') {
          return jsonResponse(participationTypeResponse())
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'DELETE') {
          deleted = true
          return new Response(null, { status: 204 })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffParticipationTypeEditPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    const deleteButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes('参加種別を削除'))
    if (!deleteButton) {
      throw new Error('delete button not found')
    }
    await deleteButton.trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith(buildDeleteStaffParticipationTypeConfirmMessage())
    expect(deleted).toBe(false)
    expect(router.currentRoute.value.path).toBe('/staff/circles/participation_types/participation-type-food/edit')
  })
})

function participationTypeResponse() {
  return {
    id: 'participation-type-food',
    name: '模擬店',
    description: '模擬店の参加種別です。',
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
      isParticipationForm: true,
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
