import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffFormAnswersIndexPage from './index.vue'

const formCircleB1 = {
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
}

describe('StaffFormAnswersIndexPage', () => {
  it('lists answers and links to the Laravel-like create/upload flows', async () => {
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers', () =>
        HttpResponse.json({
          form: formCircleB1,
          answers: [],
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
        { path: '/staff/forms/:formId/answers', component: StaffFormAnswersIndexPage },
        { path: '/staff/forms/:formId/answers/create', component: { template: '<div>create</div>' } },
        { path: '/staff/forms/:formId/answers/uploads', component: { template: '<div>uploads</div>' } },
        { path: '/staff/forms/:formId/not_answered', component: { template: '<div>not answered</div>' } },
        { path: '/staff/forms/:formId/answers/:answerId/edit', component: { template: '<div>edit</div>' } },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>form</div>' } }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/answers')
    await router.isReady()

    const wrapper = mount(StaffFormAnswersIndexPage, {
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
    const links = wrapper.findAll('a').map((link) => link.text())
    expect(links).toContain('新規回答')
    expect(links).toContain('ファイルを一括ダウンロード')
    expect(links).toContain('未提出企画を表示')
    expect(wrapper.text()).toContain('公開設定 : 公開')
    expect(wrapper.text()).toContain('展示 のタグを持つ企画に限定公開')
    expect(wrapper.text()).toContain('展示レイアウトと機材使用申請を提出してください。')
    expect(wrapper.text()).toContain('まだ回答はありません。')
  })

  it('links not answered circles to dedicated page and circle detail', async () => {
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers', () =>
        HttpResponse.json({
          form: formCircleB1,
          answers: [],
          circles: [],
          notAnsweredCircles: [
            {
              id: 'circle-a',
              name: 'デモ企画A',
              groupName: 'Aブロック',
              participationTypeName: '模擬店'
            }
          ]
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
        { path: '/staff/forms/:formId/answers', component: StaffFormAnswersIndexPage },
        { path: '/staff/forms/:formId/answers/create', component: { template: '<div>create</div>' } },
        { path: '/staff/forms/:formId/answers/uploads', component: { template: '<div>uploads</div>' } },
        { path: '/staff/forms/:formId/not_answered', component: { template: '<div>not answered</div>' } },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>form</div>' } }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/answers')
    await router.isReady()

    const wrapper = mount(StaffFormAnswersIndexPage, {
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

    expect(wrapper.get('a[href="/staff/forms/form-circle-b-1/not_answered"]').text()).toContain('未提出企画を表示')
    expect(wrapper.get('a[href="/staff/forms/form-circle-b-1/not_answered"]').exists()).toBe(true)
  })

  it('hides the not answered link for participation forms', async () => {
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers', () =>
        HttpResponse.json({
          form: {
            ...formCircleB1,
            name: '参加登録フォーム',
            description: '参加登録用です。',
            maxAnswers: 1,
            answerableTags: [],
            confirmationMessage: '',
            isParticipationForm: true
          },
          answers: [],
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
        { path: '/staff/forms/:formId/answers', component: StaffFormAnswersIndexPage },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>form</div>' } }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/answers')
    await router.isReady()

    const wrapper = mount(StaffFormAnswersIndexPage, {
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

    expect(wrapper.text()).not.toContain('未提出企画を表示')
  })
})
