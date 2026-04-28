import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
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
  })

  it('creates a staff form and navigates to editor', async () => {
    let createdRequestBody: Record<string, unknown> | null = null

    server.use(
      http.get('/v1/staff/tags', () =>
        HttpResponse.json([
          { id: 'tag-exhibit', name: '展示' },
          { id: 'tag-required', name: '必須' }
        ])
      ),
      http.post('/v1/staff/forms', async ({ request }) => {
        createdRequestBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            circle: { id: '', name: '' },
            id: '0195ec00-00a1-7000-8000-000000000001',
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
        { path: '/staff/forms', component: { template: '<div>forms</div>' } },
        { path: '/staff/forms/create', component: StaffFormCreatePage },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } }
      ]
    })
    await router.push('/staff/forms/create')
    await router.isReady()

    const wrapper = mount(StaffFormCreatePage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    await wrapper.get('input[name="name"]').setValue('追加ヒアリング')
    await wrapper.get('textarea[name="description"]').setValue('当日の搬入担当者を確認します。')
    await wrapper.get('input[name="openAt"]').setValue('2026-03-15T09:00')
    await wrapper.get('input[name="closeAt"]').setValue('2026-03-30T18:45')
    await wrapper.get('input[name="maxAnswers"]').setValue('3')
    await wrapper.get('input[name="answerableTags"]').setValue('展')
    const exhibitTagButton = wrapper.findAll('button').find((button) => button.text() === '展示')
    if (!exhibitTagButton) {
      throw new Error('exhibit tag button not found')
    }
    await exhibitTagButton.trigger('click')
    await wrapper.get('input[name="answerableTags"]').setValue('必')
    const requiredTagButton = wrapper.findAll('button').find((button) => button.text() === '必須')
    if (!requiredTagButton) {
      throw new Error('required tag button not found')
    }
    await requiredTagButton.trigger('click')
    await wrapper.get('textarea[name="confirmationMessage"]').setValue('回答ありがとうございました。')
    await wrapper.get('button[type="submit"]').trigger('submit')
    await flushPromises()

    expect(createdRequestBody).toMatchObject({
      maxAnswers: 3,
      answerableTags: ['展示', '必須'],
      confirmationMessage: '回答ありがとうございました。'
    })
    expect(createdRequestBody).not.toHaveProperty('circleId')
    expect(String(createdRequestBody?.openAt)).toMatch(/^2026-03-15T/)
    expect(String(createdRequestBody?.closeAt)).toMatch(/^2026-03-30T/)
    expect(router.currentRoute.value.fullPath).toBe('/staff/forms/0195ec00-00a1-7000-8000-000000000001/editor')
  })
})
