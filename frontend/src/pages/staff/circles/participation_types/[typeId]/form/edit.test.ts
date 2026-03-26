import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffParticipationTypeFormSettingsPage from './edit.vue'

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

describe('StaffParticipationTypeFormSettingsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows tab strip and updates form settings', async () => {
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
        { path: '/staff/circles/participation_types/:typeId/edit', component: { template: '<div>edit tab</div>' } },
        {
          path: '/staff/circles/participation_types/:typeId/form/edit',
          component: StaffParticipationTypeFormSettingsPage
        },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>form editor</div>' } }
      ]
    })
    await router.push('/staff/circles/participation_types/participation-type-food/form/edit')
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

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'GET') {
          return jsonResponse({
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
          })
        }

        if (pathname.endsWith('/staff/participation-types/participation-type-food') && method === 'PUT') {
          if (input instanceof Request) {
            updatedRequestBody = await input.clone().text()
          } else if (typeof init?.body === 'string') {
            updatedRequestBody = init.body
          }

          return jsonResponse({
            id: 'participation-type-food',
            name: '模擬店',
            description: '模擬店の参加種別です。',
            usersCountMin: 1,
            usersCountMax: 4,
            tags: ['模擬店'],
            form: {
              id: 'form-participation-food',
              name: '企画参加登録',
              description: '更新後の説明',
              openAt: '2026-03-02T00:00:00Z',
              closeAt: '2026-03-30T23:59:59Z',
              isPublic: false,
              isOpen: false,
              maxAnswers: 1,
              isParticipationForm: true,
              answerableTags: [],
              confirmationMessage: '更新後メッセージ'
            }
          })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffParticipationTypeFormSettingsPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('企画一覧')
    expect(wrapper.text()).toContain('参加種別を編集')
    expect(wrapper.text()).toContain('参加登録フォームの設定')
    expect(wrapper.get('a[href="/staff/forms/form-participation-food/editor"]').text()).toContain(
      'フォームエディターを開く'
    )

    await wrapper.get('input[name="isPublic"]').setValue(false)
    await wrapper.get('input[name="openAt"]').setValue('2026-03-02T09:30')
    await wrapper.get('input[name="closeAt"]').setValue('2026-03-30T18:45')
    await wrapper.get('textarea[name="formDescription"]').setValue('更新後の説明')
    await wrapper.get('textarea[name="formConfirmationMessage"]').setValue('更新後メッセージ')
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(updatedRequestBody).toContain('更新後の説明')
    expect(updatedRequestBody).toContain('更新後メッセージ')
    expect(wrapper.text()).toContain('参加登録フォーム設定を更新しました。')
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
