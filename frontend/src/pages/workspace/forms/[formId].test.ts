import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from '@/features/session/store'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import FormDetailPage from './[formId].vue'

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

function setupSession() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const sessionStore = useSessionStore()
  sessionStore.hydrate({
    csrfToken: 'csrf-token',
    currentCircle: { id: 'circle-a', name: 'デモ企画A' },
    featureFlags: [],
    roles: ['participant'],
    user: { id: 'demo-user', displayName: 'Demo User' }
  })
  return pinia
}

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/workspace/forms', component: { template: '<div>forms</div>' } },
      { path: '/workspace/forms/:formId', component: FormDetailPage }
    ]
  })
  return router
}

const fullFormFixture = {
  id: 'form-circle-a-1',
  name: '搬入確認フォーム',
  description: '搬入予定時刻と責任者情報を提出してください。',
  openAt: '2026-03-01T00:00:00Z',
  closeAt: '2026-03-20T23:59:59Z',
  maxAnswers: 2,
  answerableTags: ['模擬店'],
  confirmationMessage: '搬入確認フォームへの回答ありがとうございました。',
  isPublic: true,
  isOpen: true,
  currentCircleStatus: 'approved',
  questions: [
    {
      id: 'question-text',
      name: '搬入責任者',
      description: '当日の責任者氏名',
      type: 'text',
      isRequired: true,
      numberMin: null,
      numberMax: null,
      allowedTypes: '',
      options: [],
      priority: 1,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z'
    },
    {
      id: 'question-checkbox',
      name: '必要設備',
      description: '必要なものを選択',
      type: 'checkbox',
      isRequired: false,
      numberMin: null,
      numberMax: null,
      allowedTypes: '',
      options: ['机', '椅子'],
      priority: 2,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z'
    },
    {
      id: 'question-upload',
      name: 'レイアウト図',
      description: 'PDF を提出してください',
      type: 'upload',
      isRequired: false,
      numberMin: null,
      numberMax: null,
      allowedTypes: 'pdf',
      options: [],
      priority: 3,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z'
    }
  ]
}

const savedUploads = [
  {
    id: 'upload-1',
    questionId: 'question-upload',
    filename: 'layout.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 128,
    createdAt: '2026-03-05T10:10:00Z'
  }
]

describe('FormDetailPage', () => {
  it('renders Laravel-like question fields and saves an answer', async () => {
    let savedDetails: Record<string, string | string[]> = {}
    // SavedUploads は初期状態から存在する（元のテストと同じ挙動）
    let hasExistingAnswer = true

    server.use(
      http.get('/v1/forms/:formId', () => HttpResponse.json(fullFormFixture)),
      http.get('/v1/forms/:formId/answers', () => {
        return HttpResponse.json({
          answers: hasExistingAnswer
            ? [
                {
                  id: 'answer-1',
                  body: '搬入責任者: 山田\n必要設備: 机',
                  updatedAt: '2026-03-05T10:00:00Z',
                  details: {
                    'question-text':
                      typeof savedDetails['question-text'] === 'string' ? [savedDetails['question-text']] : [],
                    'question-checkbox': Array.isArray(savedDetails['question-checkbox'])
                      ? savedDetails['question-checkbox']
                      : []
                  },
                  uploads: savedUploads
                }
              ]
            : []
        })
      }),
      http.get('/v1/forms/:formId/answer', () => {
        return HttpResponse.json({
          answer: hasExistingAnswer
            ? {
                id: 'answer-1',
                body: '搬入責任者: 山田\n必要設備: 机',
                updatedAt: '2026-03-05T10:00:00Z',
                details: {
                  'question-text':
                    typeof savedDetails['question-text'] === 'string' ? [savedDetails['question-text']] : [],
                  'question-checkbox': Array.isArray(savedDetails['question-checkbox'])
                    ? savedDetails['question-checkbox']
                    : []
                },
                uploads: savedUploads
              }
            : null
        })
      }),
      http.put('/v1/forms/:formId/answer', async ({ request }) => {
        const body = (await request.json()) as { details?: Record<string, string | string[]> }
        savedDetails = body.details ?? {}
        hasExistingAnswer = true
        return HttpResponse.json({
          answer: {
            id: 'answer-1',
            body: '搬入責任者: 山田\n必要設備: 机',
            updatedAt: '2026-03-05T10:00:00Z',
            details: {
              'question-text': typeof savedDetails['question-text'] === 'string' ? [savedDetails['question-text']] : [],
              'question-checkbox': Array.isArray(savedDetails['question-checkbox'])
                ? savedDetails['question-checkbox']
                : []
            },
            uploads: savedUploads
          }
        })
      }),
      http.get('/v1/forms/:formId/answers/:answerId', () => {
        return HttpResponse.json({
          answer: hasExistingAnswer
            ? {
                id: 'answer-1',
                body: '搬入責任者: 山田\n必要設備: 机',
                updatedAt: '2026-03-05T10:00:00Z',
                details: {
                  'question-text':
                    typeof savedDetails['question-text'] === 'string' ? [savedDetails['question-text']] : [],
                  'question-checkbox': Array.isArray(savedDetails['question-checkbox'])
                    ? savedDetails['question-checkbox']
                    : []
                },
                uploads: savedUploads
              }
            : null
        })
      }),
      http.put('/v1/forms/:formId/answers/:answerId', async ({ request }) => {
        const body = (await request.json()) as { details?: Record<string, string | string[]> }
        savedDetails = body.details ?? {}
        hasExistingAnswer = true
        return HttpResponse.json({
          answer: {
            id: 'answer-1',
            body: '搬入責任者: 山田\n必要設備: 机',
            updatedAt: '2026-03-05T10:00:00Z',
            details: {
              'question-text': typeof savedDetails['question-text'] === 'string' ? [savedDetails['question-text']] : [],
              'question-checkbox': Array.isArray(savedDetails['question-checkbox'])
                ? savedDetails['question-checkbox']
                : []
            },
            uploads: savedUploads
          }
        })
      }),
      http.post('/v1/forms/:formId/answer/uploads', () => HttpResponse.json(savedUploads[0], { status: 201 }))
    )

    const pinia = setupSession()
    const router = makeRouter()
    await router.push('/workspace/forms/form-circle-a-1')
    await router.isReady()

    const wrapper = mount(FormDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('搬入確認フォーム')
    expect(wrapper.text()).toContain('搬入責任者')
    expect(wrapper.text()).toContain('必要設備')
    expect(wrapper.text()).toContain('レイアウト図')
    expect(wrapper.text()).toContain('1企画あたり 2 件まで回答できます。')
    expect(wrapper.text()).toContain('模擬店')

    await vi.waitFor(
      () => {
        expect(wrapper.text()).toContain('搬入確認フォームへの回答ありがとうございました。')
      },
      { timeout: 5000 }
    )

    expect(wrapper.text()).toContain('申請企画名')

    const inputs = wrapper.findAll('input[type="text"]').filter((input) => !input.element.hasAttribute('readonly'))
    const textInput = inputs[0]
    if (!textInput) {
      throw new Error('Question text input was not rendered')
    }
    await textInput.setValue('山田')

    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('回答の最終更新日時 : 2026年3月5日(木) 19:00')
    expect(wrapper.text()).toContain('回答を編集')
    expect(savedDetails['question-text']).toBe('山田')
    expect(savedDetails['question-checkbox']).toEqual(['机'])
    expect(wrapper.text()).toContain('layout.pdf')
  })

  it('renders validation errors returned by the answer API', async () => {
    server.use(
      http.get('/v1/forms/:formId', () =>
        HttpResponse.json({
          id: 'form-circle-a-1',
          name: '搬入確認フォーム',
          description: '搬入予定時刻と責任者情報を提出してください。',
          openAt: '2026-03-01T00:00:00Z',
          closeAt: '2026-03-20T23:59:59Z',
          maxAnswers: 1,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: true,
          currentCircleStatus: 'approved',
          questions: [
            {
              id: 'question-text',
              name: '搬入責任者',
              description: '当日の責任者氏名',
              type: 'text',
              isRequired: true,
              numberMin: null,
              numberMax: null,
              allowedTypes: '',
              options: [],
              priority: 1,
              createdAt: '2026-03-01T00:00:00Z',
              updatedAt: '2026-03-01T00:00:00Z'
            }
          ]
        })
      ),
      http.get('/v1/forms/:formId/answers', () => HttpResponse.json({ answers: [] })),
      http.get('/v1/forms/:formId/answer', () => HttpResponse.json({ answer: null })),
      http.put('/v1/forms/:formId/answer', () =>
        HttpResponse.json(
          {
            message: 'validation_error',
            errors: {
              'details.question-text': ['この設問は必須です']
            }
          },
          { status: 422 }
        )
      )
    )

    const pinia = setupSession()
    const router = makeRouter()
    await router.push('/workspace/forms/form-circle-a-1')
    await router.isReady()

    const wrapper = mount(FormDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    // Fill in a value so client-side validation passes; the mock API returns 422 regardless
    const inputs = wrapper.findAll('input[type="text"]').filter((input) => !input.element.hasAttribute('readonly'))
    const textInput = inputs[0]
    if (textInput) {
      await textInput.setValue('some value')
    }

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('この設問は必須です')
  })

  it('selects the latest answer automatically when multiple answers exist', async () => {
    server.use(
      http.get('/v1/forms/:formId', () =>
        HttpResponse.json({
          id: 'form-circle-a-1',
          name: '搬入確認フォーム',
          description: '搬入予定時刻と責任者情報を提出してください。',
          openAt: '2026-03-01T00:00:00Z',
          closeAt: '2026-03-20T23:59:59Z',
          maxAnswers: 2,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: true,
          currentCircleStatus: 'approved',
          hasAnswer: true,
          questions: [
            {
              id: 'question-text',
              name: '搬入責任者',
              description: '当日の責任者氏名',
              type: 'text',
              isRequired: true,
              numberMin: null,
              numberMax: null,
              allowedTypes: '',
              options: [],
              priority: 1,
              createdAt: '2026-03-01T00:00:00Z',
              updatedAt: '2026-03-01T00:00:00Z'
            }
          ]
        })
      ),
      http.get('/v1/forms/:formId/answers', () =>
        HttpResponse.json({
          answers: [
            {
              id: 'answer-2',
              body: '新しい回答',
              updatedAt: '2026-03-06T10:00:00Z',
              details: { 'question-text': ['佐藤'] },
              uploads: []
            },
            {
              id: 'answer-1',
              body: '古い回答',
              updatedAt: '2026-03-05T10:00:00Z',
              details: { 'question-text': ['山田'] },
              uploads: []
            }
          ]
        })
      ),
      http.get('/v1/forms/:formId/answers/:answerId', ({ params }) => {
        if (params.answerId === 'answer-2') {
          return HttpResponse.json({
            answer: {
              id: 'answer-2',
              body: '新しい回答',
              updatedAt: '2026-03-06T10:00:00Z',
              details: { 'question-text': ['佐藤'] },
              uploads: []
            }
          })
        }
        return HttpResponse.json({
          answer: {
            id: 'answer-1',
            body: '古い回答',
            updatedAt: '2026-03-05T10:00:00Z',
            details: { 'question-text': ['山田'] },
            uploads: []
          }
        })
      })
    )

    const pinia = setupSession()
    const router = makeRouter()
    await router.push('/workspace/forms/form-circle-a-1')
    await router.isReady()

    const wrapper = mount(FormDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()
    await flushPromises()

    expect(router.currentRoute.value.query.answer).toBe('answer-2')
    expect(wrapper.text()).toContain('回答の最終更新日時 : 2026年3月6日(金) 19:00')
    const createButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes('新しい回答を作成'))
    expect(createButton).toBeDefined()
    if (!createButton) {
      throw new Error('Create button was not rendered')
    }
    expect((createButton.element as HTMLButtonElement).disabled).toBe(true)
    const secondTextInput = wrapper
      .findAll('input[type="text"]')
      .find((input) => !input.element.hasAttribute('readonly'))
    expect(secondTextInput).toBeDefined()
    if (!secondTextInput) {
      throw new Error('2番目のテキスト入力が見つかりません')
    }
    expect((secondTextInput.element as HTMLInputElement).value).toBe('佐藤')
  })

  it('disables submission when current circle is not approved', async () => {
    server.use(
      http.get('/v1/forms/:formId', () =>
        HttpResponse.json({
          id: 'form-circle-a-1',
          name: '搬入確認フォーム',
          description: '搬入予定時刻と責任者情報を提出してください。',
          openAt: '2026-03-01T00:00:00Z',
          closeAt: '2026-03-20T23:59:59Z',
          maxAnswers: 2,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: true,
          currentCircleStatus: 'pending',
          questions: [
            {
              id: 'question-text',
              name: '搬入責任者',
              description: '当日の責任者氏名',
              type: 'text',
              isRequired: true,
              numberMin: null,
              numberMax: null,
              allowedTypes: '',
              options: [],
              priority: 1,
              createdAt: '2026-03-01T00:00:00Z',
              updatedAt: '2026-03-01T00:00:00Z'
            }
          ]
        })
      ),
      http.get('/v1/forms/:formId/answers', () => HttpResponse.json({ answers: [] })),
      http.get('/v1/forms/:formId/answer', () => HttpResponse.json({ answer: null }))
    )

    const pinia = setupSession()
    const router = makeRouter()
    await router.push('/workspace/forms/form-circle-a-1')
    await router.isReady()

    const wrapper = mount(FormDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('企画が受理されていないため申請できません。')
    expect(wrapper.text()).toContain('回答を新規作成')

    const createButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes('新しい回答を作成'))
    expect(createButton).toBeDefined()
    if (!createButton) {
      throw new Error('Create button was not rendered')
    }
    expect((createButton.element as HTMLButtonElement).disabled).toBe(true)

    const submitButton = wrapper.get('button[type="submit"]')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps the create-answer button visible when a multi-answer form already has a selected answer', async () => {
    server.use(
      http.get('/v1/forms/:formId', () =>
        HttpResponse.json({
          id: 'form-circle-a-1',
          name: '搬入確認フォーム',
          description: '搬入予定時刻と責任者情報を提出してください。',
          openAt: '2026-03-01T00:00:00Z',
          closeAt: '2026-03-20T23:59:59Z',
          maxAnswers: 2,
          answerableTags: [],
          confirmationMessage: '',
          isPublic: true,
          isOpen: true,
          currentCircleStatus: 'approved',
          hasAnswer: true,
          questions: [
            {
              id: 'question-text',
              name: '搬入責任者',
              description: '当日の責任者氏名',
              type: 'text',
              isRequired: true,
              numberMin: null,
              numberMax: null,
              allowedTypes: '',
              options: [],
              priority: 1,
              createdAt: '2026-03-01T00:00:00Z',
              updatedAt: '2026-03-01T00:00:00Z'
            }
          ]
        })
      ),
      http.get('/v1/forms/:formId/answers', () =>
        HttpResponse.json({
          answers: [
            {
              id: 'answer-1',
              body: '最初の回答',
              updatedAt: '2026-03-05T10:00:00Z',
              details: { 'question-text': ['山田'] },
              uploads: []
            }
          ]
        })
      ),
      http.get('/v1/forms/:formId/answers/:answerId', () =>
        HttpResponse.json({
          answer: {
            id: 'answer-1',
            body: '最初の回答',
            updatedAt: '2026-03-05T10:00:00Z',
            details: { 'question-text': ['山田'] },
            uploads: []
          }
        })
      )
    )

    const pinia = setupSession()
    const router = makeRouter()
    await router.push('/workspace/forms/form-circle-a-1')
    await router.isReady()

    const wrapper = mount(FormDetailPage, {
      global: {
        plugins: [pinia, router, createQueryPlugin()]
      }
    })
    await flushPromises()
    await flushPromises()

    expect(router.currentRoute.value.query.answer).toBe('answer-1')
    const createButton = wrapper
      .findAll('button[type="button"]')
      .find((button) => button.text().includes('新しい回答を作成'))
    expect(createButton).toBeDefined()
    if (!createButton) {
      throw new Error('Create button was not rendered')
    }
    expect((createButton.element as HTMLButtonElement).disabled).toBe(false)
  })
})
