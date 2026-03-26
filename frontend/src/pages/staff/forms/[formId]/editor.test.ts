import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '@/features/session/store'
import StaffFormEditorPage from './editor.vue'

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

describe('StaffFormEditorPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders and edits staff form questions', async () => {
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
        { path: '/staff/forms', component: { template: '<div>forms</div>' } },
        { path: '/staff/forms/:formId/editor', component: StaffFormEditorPage },
        {
          path: '/staff/forms/:formId/answers',
          component: { template: '<div>answers</div>' }
        },
        {
          path: '/staff/forms/:formId/edit',
          component: { template: '<div>edit</div>' }
        }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/editor')
    await router.isReady()

    let questions = [
      {
        id: 'question-1',
        name: '責任者名',
        description: '当日の責任者を入力してください',
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
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        await Promise.resolve()
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

        const pathname = new URL(url, 'http://localhost').pathname

        if (pathname.endsWith('/staff/status') && method === 'GET') {
          return new Response(JSON.stringify({ allowed: true, authorized: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        if (pathname.endsWith('/staff/forms/form-circle-b-1') && method === 'GET') {
          return new Response(
            JSON.stringify({
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
              createdAt: '2026-03-01T12:00:00Z',
              updatedAt: '2026-03-01T12:00:00Z',
              isParticipationForm: false,
              questions,
              answer: null
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        if (pathname.endsWith('/staff/forms/form-circle-b-1/questions') && method === 'POST') {
          questions = [
            ...questions,
            {
              id: 'question-2',
              name: '',
              description: '',
              type: 'radio',
              isRequired: false,
              numberMin: null,
              numberMax: null,
              allowedTypes: '',
              options: [],
              priority: 2,
              createdAt: '2026-03-06T10:00:00Z',
              updatedAt: '2026-03-06T10:00:00Z'
            }
          ]
          return new Response(JSON.stringify(questions[1]), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        if (pathname.endsWith('/staff/forms/form-circle-b-1/questions/question-2') && method === 'PUT') {
          questions[1] = {
            ...questions[1],
            name: '参加日',
            description: '参加日を選択してください',
            options: ['1日目', '2日目'],
            isRequired: true
          }
          return new Response(JSON.stringify(questions[1]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        throw new Error(`Unexpected request: ${method} ${url}`)
      })
    )

    const wrapper = mount(StaffFormEditorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('責任者名')

    await wrapper.get('select').setValue('radio')
    await wrapper.findAll('button[type="button"]')[0].trigger('click')
    await flushPromises()
    await flushPromises()

    const questionArticles = wrapper.findAll('article')
    const latestQuestion = questionArticles[questionArticles.length - 1]
    await latestQuestion.findAll('input[type="text"]')[0].setValue('参加日')
    await latestQuestion.findAll('textarea')[0].setValue('参加日を選択してください')
    await latestQuestion.findAll('textarea')[1].setValue('1日目\n2日目')
    await latestQuestion.find('input[type="checkbox"]').setValue(true)
    await latestQuestion.findAll('button[type="button"]')[2].trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('参加日')
  })
})
