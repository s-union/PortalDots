import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffFormUploadsPage from './uploads.vue'

describe('StaffFormUploadsPage', () => {
  it('shows upload summary and zip download link', async () => {
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
              id: 'answer-1',
              circle: {
                id: 'circle-a',
                name: 'デモ企画A',
                groupName: 'Aブロック',
                participationTypeName: '模擬店'
              },
              body: '前回回答',
              createdAt: '2026-03-13T10:00:00Z',
              updatedAt: '2026-03-13T12:00:00Z',
              uploadCount: 2,
              details: {}
            },
            {
              id: 'answer-2',
              circle: {
                id: 'circle-b',
                name: 'デモ企画B',
                groupName: 'Bブロック',
                participationTypeName: '展示'
              },
              body: '追加回答',
              createdAt: '2026-03-14T10:00:00Z',
              updatedAt: '2026-03-14T12:00:00Z',
              uploadCount: 1,
              details: {}
            }
          ],
          circles: [],
          notAnsweredCircles: []
        })
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
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>edit tab</div>' } },
        { path: '/staff/forms/:formId/answers/uploads', component: StaffFormUploadsPage }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/answers/uploads')
    await router.isReady()

    const wrapper = mount(StaffFormUploadsPage, {
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

    expect(wrapper.text()).toContain('アップロードファイルの一括ダウンロード')
    expect(wrapper.text()).toContain('展示チェックフォーム')
    expect(wrapper.text()).toContain('アップロード件数:')
    expect(wrapper.text()).toContain('3 件')
    expect(wrapper.get('a[href$="/v1/staff/forms/form-circle-b-1/answers/uploads.zip"]').text()).toContain(
      'ダウンロードする (ZIP)'
    )
  })
})
