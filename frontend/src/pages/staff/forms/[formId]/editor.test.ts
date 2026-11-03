import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, enableAutoUnmount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import StaffFormEditorPage from './editor.vue'
import { parseStaffFormQuestion } from '@/features/staff/forms/api'

enableAutoUnmount(afterEach)

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
  })

  it('preserves another question draft when a pending save refreshes the form', async () => {
    const makeQuestion = (id: string, name: string, priority: number) =>
      parseStaffFormQuestion({
        id,
        name,
        description: '',
        type: 'text',
        isRequired: false,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: [],
        priority,
        createdAt: '2026-03-05T10:00:00Z',
        updatedAt: '2026-03-05T10:00:00Z'
      })
    const secondQuestion = makeQuestion('question-b', '設問 B', 2)
    let questions = [makeQuestion('question-a', '設問 A', 1), secondQuestion]
    const pending = Promise.withResolvers<Response>()
    const started = Promise.withResolvers<void>()
    const payloads: unknown[] = []
    let reads = 0
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1', () => {
        reads++
        return HttpResponse.json({
          id: 'form-circle-b-1',
          circle: { id: 'circle-b', name: '企画' },
          name: 'フォーム',
          description: '',
          openAt: '2026-03-02T00:00:00Z',
          closeAt: '2026-03-22T23:59:59Z',
          maxAnswers: 2,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: true,
          createdAt: '2026-03-01T12:00:00Z',
          updatedAt: '2026-03-01T12:00:00Z',
          isParticipationForm: false,
          questions,
          answer: null
        })
      }),
      http.put('/v1/staff/forms/form-circle-b-1/questions/question-a', async ({ request }) => {
        payloads.push(await request.json())
        started.resolve()
        return pending.promise
      })
    )
    const pinia = createPinia()
    setActivePinia(pinia)
    useSessionStore().hydrate({
      csrfToken: 'csrf-token',
      currentCircle: null,
      featureFlags: [],
      roles: ['admin'],
      user: { id: 'staff-user', displayName: 'Staff User' }
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/staff/forms/:formId/editor', component: StaffFormEditorPage }]
    })
    await router.push('/staff/forms/form-circle-b-1/editor')
    await router.isReady()
    const wrapper = mount(StaffFormEditorPage, { global: { plugins: [pinia, router, createQueryPlugin()] } })
    await flushPromises()
    const cards = wrapper.findAll('article')
    const first = cards[0]
    const second = cards[1]
    if (!first || !second) throw new Error('Both questions must be rendered')
    await first.get('[role="button"]').trigger('click')
    const firstName = first.findAll('input[type="text"]').at(-1)
    if (!firstName) throw new Error('Question name input must be rendered')
    await firstName.setValue('設問 A を保存')
    await firstName.trigger('blur')
    await started.promise
    await second.get('[role="button"]').trigger('click')
    const secondName = second.findAll('input[type="text"]').at(-1)
    if (!secondName) throw new Error('Question name input must be rendered')
    await secondName.setValue('設問 B の未保存入力')
    questions = [makeQuestion('question-a', '設問 A を保存', 1), secondQuestion]
    pending.resolve(HttpResponse.json(questions[0]))
    await vi.waitFor(() => expect(reads).toBeGreaterThan(1))
    await flushPromises()
    expect(secondName.element.value).toBe('設問 B の未保存入力')
    expect(payloads).toEqual([
      {
        name: '設問 A を保存',
        description: '',
        type: 'text',
        isRequired: false,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: [],
        priority: 1
      }
    ])
  })

  it('renders the legacy-like editor layout and edits staff form questions', async () => {
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

    server.use(
      http.get('/v1/public/config', () => HttpResponse.json({ isDemo: true, appName: 'PortalDots' })),
      http.get('/v1/staff/forms/form-circle-b-1', () =>
        HttpResponse.json({
          id: 'form-circle-b-1',
          circle: { id: 'circle-b', name: 'デモ企画B' },
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
        })
      ),
      http.post('/v1/staff/forms/form-circle-b-1/questions', () => {
        const createdQuestion = {
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
        questions = [...questions, createdQuestion]
        return HttpResponse.json(createdQuestion, { status: 201 })
      }),
      http.put('/v1/staff/forms/form-circle-b-1/questions/question-2', async ({ request }) => {
        const payload = (await request.json()) as Record<string, unknown>
        questions[1] = { ...questions[1], ...payload }
        return HttpResponse.json(questions[1])
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
        { path: '/staff/forms', component: { template: '<div>forms</div>' } },
        { path: '/staff/forms/:formId/editor', component: StaffFormEditorPage },
        { path: '/staff/forms/:formId/answers', component: { template: '<div>answers</div>' } },
        { path: '/staff/forms/:formId/edit', component: { template: '<div>edit</div>' } }
      ]
    })
    await router.push('/staff/forms/form-circle-b-1/editor')
    await router.isReady()

    const wrapper = mount(StaffFormEditorPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('フォームエディター')
    expect(wrapper.text()).toContain('展示チェックフォーム')
    expect(wrapper.text()).toContain('責任者名')

    const addRadioButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('単一選択') && button.text().includes('ラジオボタン'))
    expect(addRadioButton).toBeDefined()
    await addRadioButton!.trigger('click')
    await flushPromises()
    await flushPromises()

    const questionArticles = wrapper.findAll('article')
    expect(questionArticles.length).toBeGreaterThanOrEqual(2)

    const latestQuestion = questionArticles[questionArticles.length - 1]
    const textInputs = latestQuestion.findAll('input[type="text"]')
    await textInputs[textInputs.length - 1].setValue('参加日')
    await textInputs[textInputs.length - 1].trigger('blur')

    const textareas = latestQuestion.findAll('textarea')
    await textareas[0].setValue('参加日を選択してください')
    await textareas[0].trigger('blur')
    await textareas[1].setValue('1日目\n2日目')
    await textareas[1].trigger('blur')

    const requiredCheckbox = latestQuestion.findAll('input[type="checkbox"]')[0]
    await requiredCheckbox.setValue(true)

    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('参加日')
    expect(wrapper.text()).toContain('1日目')
    expect(wrapper.text()).toContain('2日目')
    expect(wrapper.text()).toContain('保存しました')
  })
})
