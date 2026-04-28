import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffFormAnswerCreatePage from './create.vue'

describe('StaffFormAnswerCreatePage', () => {
  it('creates a new answer for the selected circle', async () => {
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers', () =>
        HttpResponse.json({
          form: {
            id: 'form-circle-b-1',
            name: '展示チェックフォーム',
            description: '展示レイアウトと機材使用申請を提出してください。',
            openAt: '2026-03-02T00:00:00Z',
            closeAt: '2026-03-22T23:59:59Z',
            maxAnswers: 2,
            answerableTags: ['展示'],
            confirmationMessage: '回答ありがとうございました。',
            isPublic: true,
            isOpen: true,
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-01T10:00:00Z',
            isParticipationForm: false,
            questions: [],
            answer: null
          },
          answers: [
            {
              id: 'answer-old',
              circle: {
                id: 'circle-a',
                name: 'デモ企画A',
                groupName: 'Aブロック',
                participationTypeName: '模擬店'
              },
              body: '前回回答',
              createdAt: '2026-03-13T10:00:00Z',
              updatedAt: '2026-03-13T12:00:00Z',
              uploadCount: 1,
              details: {}
            }
          ],
          circles: [
            {
              id: 'circle-a',
              name: 'デモ企画A',
              groupName: 'Aブロック',
              participationTypeName: '模擬店'
            }
          ],
          notAnsweredCircles: []
        })
      ),
      http.post('/v1/staff/forms/form-circle-b-1/answers', () =>
        HttpResponse.json(
          {
            answer: {
              id: 'answer-created',
              circle: {
                id: 'circle-a',
                name: 'デモ企画A',
                groupName: 'Aブロック',
                participationTypeName: '模擬店'
              },
              body: '',
              createdAt: '2026-03-14T02:00:00Z',
              updatedAt: '2026-03-14T02:00:00Z',
              uploadCount: 0,
              details: {}
            }
          },
          { status: 201 }
        )
      )
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
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>edit tab</div>' } },
        { path: '/staff/forms/:formId/answers/create', component: StaffFormAnswerCreatePage },
        { path: '/staff/forms/:formId/answers/:answerId/edit', component: { template: '<div>edit</div>' } }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/answers/create?circle=circle-a')
    await router.isReady()

    const wrapper = mount(StaffFormAnswerCreatePage, {
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
    expect(wrapper.text()).toContain('前回回答')
    expect(wrapper.text()).toContain('対象企画のメンバーへ回答更新通知メールが送信されます。')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/staff/forms/form-circle-b-1/answers/answer-created/edit')
  })
})
