import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffFormAnswerDetailPage from './edit.vue'

const answerEditFixture = {
  form: {
    id: 'form-circle-b-1',
    name: '展示チェックフォーム',
    description: '提出してください。',
    openAt: '2026-03-02T00:00:00Z',
    closeAt: '2026-03-22T23:59:59Z',
    maxAnswers: 2,
    isPublic: true,
    isOpen: true,
    answerableTags: ['展示'],
    confirmationMessage: 'ありがとうございました。',
    questions: [
      {
        id: 'question-1',
        name: '責任者名',
        description: '',
        type: 'text',
        isRequired: true,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: [],
        priority: 1,
        createdAt: '2026-03-05T10:00:00Z',
        updatedAt: '2026-03-05T10:00:00Z'
      }
    ],
    answer: null
  },
  circle: {
    id: 'circle-a',
    name: 'デモ企画A',
    groupName: 'Aブロック',
    participationTypeName: '模擬店'
  },
  answer: {
    id: 'answer-1',
    body: '初期本文',
    createdAt: '2026-03-14T02:00:00Z',
    updatedAt: '2026-03-14T02:30:00Z',
    details: { 'question-1': ['初期責任者'] },
    uploads: []
  },
  siblingAnswers: [
    {
      id: 'answer-1',
      circle: {
        id: 'circle-a',
        name: 'デモ企画A',
        groupName: 'Aブロック',
        participationTypeName: '模擬店'
      },
      body: '初期本文',
      createdAt: '2026-03-14T02:00:00Z',
      updatedAt: '2026-03-14T02:30:00Z',
      uploadCount: 0,
      details: {}
    }
  ]
}

describe('StaffFormAnswerDetailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and updates a staff answer', async () => {
    let updatedBody = ''

    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers/answer-1/edit', () => HttpResponse.json(answerEditFixture)),
      http.put('/v1/staff/forms/form-circle-b-1/answers/answer-1', async ({ request }) => {
        updatedBody = await request.text()
        return HttpResponse.json({
          id: 'answer-1',
          body: '更新後本文',
          createdAt: '2026-03-14T02:00:00Z',
          updatedAt: '2026-03-14T03:00:00Z',
          details: { 'question-1': ['更新後責任者'] },
          uploads: []
        })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/forms/:formId/answers', component: { template: '<div>index</div>' } },
        { path: '/staff/forms/:formId/answers/:answerId/edit', component: StaffFormAnswerDetailPage }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/answers/answer-1/edit')
    await router.isReady()

    const wrapper = mount(StaffFormAnswerDetailPage, {
      global: {
        plugins: [
          pinia,
          router,
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: { queries: { retry: false } }
              })
            }
          ]
        ]
      }
    })

    await flushPromises()
    expect(wrapper.text()).toContain('対象企画のメンバーへ回答更新通知メールが送信されます。')
    await wrapper.get('input[type="text"]').setValue('更新後責任者')
    await wrapper.get('button[type="button"]:last-of-type').trigger('click')
    await flushPromises()

    expect(updatedBody).toContain('更新後責任者')
  })

  it('confirms before deleting a staff answer', async () => {
    const deleteRequests: string[] = []

    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers/answer-1/edit', () =>
        HttpResponse.json({
          ...answerEditFixture,
          form: { ...answerEditFixture.form, questions: [] },
          answer: { ...answerEditFixture.answer, details: {} },
          siblingAnswers: []
        })
      ),
      http.delete('/v1/staff/forms/form-circle-b-1/answers/answer-1', ({ request }) => {
        deleteRequests.push(request.url)
        return new HttpResponse(null, { status: 204 })
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useSessionStore()
    sessionStore.hydrate({
      csrfToken: 'csrf-token',
      currentCircle: { id: 'circle-b', name: 'デモ企画B' },
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })

    const confirmMock = vi.fn(() => false)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/staff/forms/:formId/answers', component: { template: '<div>index</div>' } },
        { path: '/staff/forms/:formId/answers/:answerId/edit', component: StaffFormAnswerDetailPage }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/answers/answer-1/edit')
    await router.isReady()

    const wrapper = mount(StaffFormAnswerDetailPage, {
      global: {
        plugins: [
          pinia,
          router,
          [
            VueQueryPlugin,
            {
              queryClient: new QueryClient({
                defaultOptions: { queries: { retry: false } }
              })
            }
          ]
        ]
      }
    })

    await flushPromises()
    const deleteButton = wrapper.findAll('button[type="button"]')[0]
    await deleteButton.trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('この回答を削除しますか？'))
    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining('回答が削除されたという通知はAブロックには送信されません。')
    )
    expect(deleteRequests).toHaveLength(0)
    expect(router.currentRoute.value.fullPath).toBe('/staff/forms/form-circle-b-1/answers/answer-1/edit')
  })
})
