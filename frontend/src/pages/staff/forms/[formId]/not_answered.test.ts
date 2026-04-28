import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffFormNotAnsweredPage from './not_answered.vue'

describe('StaffFormNotAnsweredPage', () => {
  it('shows not answered circles and links to circle detail', async () => {
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
        { path: '/staff/forms/:formId/not_answered', component: StaffFormNotAnsweredPage },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } },
        { path: '/staff/forms/:formId/answers/create', component: { template: '<div>create</div>' } },
        { path: '/staff/forms/:formId/answers/uploads', component: { template: '<div>uploads</div>' } },
        { path: '/staff/forms/:formId/editor', component: { template: '<div>editor</div>' } },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>form detail</div>' } },
        { path: '/staff/circles/:circleId', component: { template: '<div>circle</div>' } }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/not_answered')
    await router.isReady()

    const wrapper = mount(StaffFormNotAnsweredPage, {
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

    expect(wrapper.text()).toContain('未回答企画一覧')
    expect(wrapper.text()).toContain('展示チェックフォーム')

    const links = wrapper.findAllComponents({ name: 'RouterLink' })
    const circleLink = links.find((link) => link.props('to') === '/staff/circles/circle-a')
    expect(circleLink?.text()).toContain('デモ企画A')
    expect(circleLink?.text()).not.toContain('circle-a')

    await circleLink?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/staff/circles/circle-a')
  })
})
