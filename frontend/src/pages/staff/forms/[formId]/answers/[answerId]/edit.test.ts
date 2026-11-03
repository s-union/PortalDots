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

const mountedPages: { unmount: () => void }[] = []

async function mountPage() {
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

  const wrapper = mount(
    { template: '<RouterView />' },
    {
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
    }
  )

  mountedPages.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('StaffFormAnswerDetailPage', () => {
  afterEach(() => {
    mountedPages.splice(0).forEach((page) => page.unmount())
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

    const { wrapper } = await mountPage()

    await flushPromises()
    expect(wrapper.text()).toContain('対象企画のメンバーへ回答更新通知メールが送信されます。')
    await wrapper.get('input[type="text"]').setValue('更新後責任者')
    await wrapper.get('form').trigger('submit')
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

    const confirmMock = vi.fn(() => false)
    vi.spyOn(window, 'confirm').mockImplementation(confirmMock)
    const { wrapper, router } = await mountPage()

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

  it('preserves edited fields and refreshes clean fields after an upload', async () => {
    const question = answerEditFixture.form.questions[0]
    const fixture = {
      ...answerEditFixture,
      form: {
        ...answerEditFixture.form,
        questions: [
          question,
          { ...question, id: 'question-2', name: '補足', isRequired: false },
          { ...question, id: 'question-upload', name: '資料', type: 'upload', isRequired: false }
        ]
      },
      answer: { ...answerEditFixture.answer, details: { 'question-1': ['初期責任者'], 'question-2': ['旧補足'] } }
    }
    let uploaded = false
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers/answer-1/edit', () =>
        HttpResponse.json({
          ...fixture,
          answer: uploaded
            ? { ...fixture.answer, details: { 'question-1': ['初期責任者'], 'question-2': ['最新補足'] } }
            : fixture.answer
        })
      ),
      http.post('/v1/staff/forms/form-circle-b-1/answers/answer-1/uploads', () => {
        uploaded = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    const { wrapper, router } = await mountPage()
    await wrapper.get('input[name="question-1"]').setValue('編集中の責任者')
    const file = new File(['document'], 'layout.pdf', { type: 'application/pdf' })
    Object.defineProperty(wrapper.get('input[type="file"]').element, 'files', { configurable: true, value: [file] })
    await wrapper.get('input[type="file"]').trigger('change')
    const upload = wrapper.findAll('button').find((button) => button.text() === '添付を更新')
    if (!upload) throw new Error('Upload button not found')
    await upload.trigger('click')
    await flushPromises()
    expect(uploaded).toBe(true)
    expect(wrapper.get<HTMLInputElement>('input[name="question-1"]').element.value).toBe('編集中の責任者')
    expect(wrapper.get<HTMLInputElement>('input[name="question-2"]').element.value).toBe('最新補足')
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await router.push('/staff/forms/form-circle-b-1/answers')
    expect(router.currentRoute.value.path).toContain('/answer-1/edit')
  })

  it('accepts the saved baseline and retains edits made while saving', async () => {
    const pending = Promise.withResolvers<Response>()
    let saved = false
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers/answer-1/edit', () =>
        HttpResponse.json({
          ...answerEditFixture,
          answer: saved
            ? { ...answerEditFixture.answer, details: { 'question-1': ['保存した責任者'] } }
            : answerEditFixture.answer
        })
      ),
      http.put('/v1/staff/forms/form-circle-b-1/answers/answer-1', () => pending.promise)
    )
    const { wrapper, router } = await mountPage()
    await wrapper.get('input[name="question-1"]').setValue('保存した責任者')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)
    await wrapper.get('input[name="question-1"]').setValue('送信後の追加編集')
    saved = true
    pending.resolve(HttpResponse.json({ ...answerEditFixture.answer, details: { 'question-1': ['保存した責任者'] } }))
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[name="question-1"]').element.value).toBe('送信後の追加編集')
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await router.push('/staff/forms/form-circle-b-1/answers')
    expect(confirm).toHaveBeenCalled()
    await wrapper.get('input[name="question-1"]').setValue('保存した責任者')
    confirm.mockClear()
    await router.push('/staff/forms/form-circle-b-1/answers')
    expect(confirm).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/staff/forms/form-circle-b-1/answers')
  })

  it('validates required answers before saving even after the form closes', async () => {
    let saves = 0
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers/answer-1/edit', () =>
        HttpResponse.json({
          ...answerEditFixture,
          form: { ...answerEditFixture.form, isOpen: false }
        })
      ),
      http.put('/v1/staff/forms/form-circle-b-1/answers/answer-1', () => {
        saves++
        return HttpResponse.json({ ...answerEditFixture.answer, details: { 'question-1': ['修正済み'] } })
      })
    )
    const { wrapper } = await mountPage()
    await wrapper.get('input[name="question-1"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('責任者名を入力してください')
    expect(saves).toBe(0)
    await wrapper.get('input[name="question-1"]').setValue('修正済み')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(saves).toBe(1)
  })

  it('confirms an answer switch and resets input to the selected answer', async () => {
    const question = answerEditFixture.form.questions[0]
    server.use(
      http.get('/v1/staff/forms/form-circle-b-1/answers/:answerId/edit', ({ params }) =>
        HttpResponse.json({
          ...answerEditFixture,
          form: {
            ...answerEditFixture.form,
            questions: [
              question,
              { ...question, id: 'question-upload', name: '資料', type: 'upload', isRequired: false }
            ]
          },
          answer: {
            ...answerEditFixture.answer,
            id: params.answerId,
            details: { 'question-1': [params.answerId === 'answer-1' ? '初期責任者' : '別回答の責任者'] }
          }
        })
      )
    )
    const { wrapper, router } = await mountPage()
    await wrapper.get('input[name="question-1"]').setValue('破棄する編集')
    const file = new File(['document'], 'previous-answer.pdf', { type: 'application/pdf' })
    Object.defineProperty(wrapper.get('input[type="file"]').element, 'files', { configurable: true, value: [file] })
    await wrapper.get('input[type="file"]').trigger('change')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await router.push('/staff/forms/form-circle-b-1/answers/answer-2/edit')
    expect(router.currentRoute.value.params.answerId).toBe('answer-1')
    expect(wrapper.get<HTMLInputElement>('input[name="question-1"]').element.value).toBe('破棄する編集')
    expect(wrapper.text()).toContain('previous-answer.pdf')
    confirm.mockReturnValue(true)
    await router.push('/staff/forms/form-circle-b-1/answers/answer-2/edit')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[name="question-1"]').element.value).toBe('別回答の責任者')
    expect(wrapper.text()).not.toContain('previous-answer.pdf')
    confirm.mockClear()
    await router.push('/staff/forms/form-circle-b-1/answers')
    expect(confirm).not.toHaveBeenCalled()
  })
})
