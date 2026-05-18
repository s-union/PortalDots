import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

const formApiMocks = vi.hoisted(() => ({
  useFormDetailQuery: vi.fn()
}))

const answersMocks = vi.hoisted(() => ({
  buildFormAnswerUploadDownloadUrl: vi.fn((formId: string, uploadId: string) => `/legacy/${formId}/${uploadId}`),
  buildFormAnswerUploadDownloadUrlByAnswer: vi.fn(
    (formId: string, answerId: string, questionId: string) => `/answers/${formId}/${answerId}/${questionId}`
  ),
  extractValidationMessage: vi.fn(() => '回答の保存に失敗しました。'),
  useCreateFormAnswerMutation: vi.fn(),
  useFormAnswerByIdQuery: vi.fn(),
  useFormAnswerEditorDraft: vi.fn(),
  useFormAnswerMutation: vi.fn(),
  useFormAnswerQuery: vi.fn(),
  useFormAnswerUploadMutation: vi.fn(),
  useFormAnswersQuery: vi.fn(),
  useUpdateFormAnswerMutation: vi.fn()
}))

vi.mock('@/features/forms/api', () => ({
  useFormDetailQuery: formApiMocks.useFormDetailQuery
}))

vi.mock('@/features/forms/answers', () => ({
  buildFormAnswerUploadDownloadUrl: answersMocks.buildFormAnswerUploadDownloadUrl,
  buildFormAnswerUploadDownloadUrlByAnswer: answersMocks.buildFormAnswerUploadDownloadUrlByAnswer,
  extractValidationMessage: answersMocks.extractValidationMessage,
  useCreateFormAnswerMutation: answersMocks.useCreateFormAnswerMutation,
  useFormAnswerByIdQuery: answersMocks.useFormAnswerByIdQuery,
  useFormAnswerEditorDraft: answersMocks.useFormAnswerEditorDraft,
  useFormAnswerMutation: answersMocks.useFormAnswerMutation,
  useFormAnswerQuery: answersMocks.useFormAnswerQuery,
  useFormAnswerUploadMutation: answersMocks.useFormAnswerUploadMutation,
  useFormAnswersQuery: answersMocks.useFormAnswersQuery,
  useUpdateFormAnswerMutation: answersMocks.useUpdateFormAnswerMutation
}))

import { useWorkspaceFormDetailPage } from './useWorkspaceFormDetailPage'

function buildForm(overrides: Record<string, unknown> = {}) {
  return {
    id: 'form-1',
    name: '参加申請',
    description: '',
    openAt: '2026-03-01T00:00:00Z',
    closeAt: '2026-03-31T23:59:59Z',
    isOpen: true,
    maxAnswers: 2,
    answerableTags: [],
    confirmationMessage: '  完了メッセージ  ',
    currentCircleStatus: 'approved',
    questions: [
      {
        id: 'q-text',
        type: 'text',
        name: '企画名',
        isRequired: true
      }
    ],
    ...overrides
  }
}

describe('useWorkspaceFormDetailPage', () => {
  const draft = ref<Record<string, string | string[]>>({ 'q-text': '初期値' })
  const formQuery = {
    data: ref(buildForm()),
    isPending: ref(false)
  }
  const answersQuery = {
    data: ref<{ answers: { id: string }[] }>({ answers: [] })
  }
  const legacyAnswerQuery = {
    data: ref<{ answer: Record<string, unknown> | null }>({ answer: null })
  }
  const selectedAnswerQuery = {
    data: ref<{ answer: Record<string, unknown> | null }>({ answer: null }),
    refetch: vi.fn().mockResolvedValue(undefined)
  }
  const createAnswerMutation = {
    mutateAsync: vi.fn(),
    isPending: ref(false)
  }
  const legacyAnswerMutation = {
    mutateAsync: vi.fn(),
    isPending: ref(false)
  }
  const updateAnswerMutation = {
    mutateAsync: vi.fn(),
    isPending: ref(false)
  }
  const uploadMutation = {
    mutateAsync: vi.fn(),
    isPending: ref(false)
  }

  beforeEach(() => {
    vi.clearAllMocks()

    draft.value = { 'q-text': '初期値' }
    formQuery.data.value = buildForm()
    answersQuery.data.value = { answers: [] }
    legacyAnswerQuery.data.value = { answer: null }
    selectedAnswerQuery.data.value = { answer: null }
    selectedAnswerQuery.refetch.mockResolvedValue(undefined)

    createAnswerMutation.mutateAsync.mockResolvedValue({
      answer: {
        id: 'answer-created'
      }
    })
    legacyAnswerMutation.mutateAsync.mockResolvedValue(undefined)
    updateAnswerMutation.mutateAsync.mockResolvedValue(undefined)
    uploadMutation.mutateAsync.mockResolvedValue(undefined)

    formApiMocks.useFormDetailQuery.mockReturnValue(formQuery)
    answersMocks.useFormAnswersQuery.mockReturnValue(answersQuery)
    answersMocks.useFormAnswerQuery.mockReturnValue(legacyAnswerQuery)
    answersMocks.useFormAnswerByIdQuery.mockReturnValue(selectedAnswerQuery)
    answersMocks.useFormAnswerEditorDraft.mockReturnValue(draft)
    answersMocks.useCreateFormAnswerMutation.mockReturnValue(createAnswerMutation)
    answersMocks.useFormAnswerMutation.mockReturnValue(legacyAnswerMutation)
    answersMocks.useUpdateFormAnswerMutation.mockReturnValue(updateAnswerMutation)
    answersMocks.useFormAnswerUploadMutation.mockReturnValue(uploadMutation)
    answersMocks.extractValidationMessage.mockReturnValue('回答の保存に失敗しました。')
  })

  it('auto-selects the first answer when the current selection is missing', async () => {
    const onSelectAnswer = vi.fn()
    answersQuery.data.value = {
      answers: [{ id: 'answer-1' }, { id: 'answer-2' }]
    }

    useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'missing-answer',
      onSelectAnswer,
      onClearSelectedAnswer: vi.fn()
    })

    await nextTick()

    expect(onSelectAnswer).toHaveBeenCalledWith('answer-1')
  })

  it('clears the selection when all answers disappear', async () => {
    const onClearSelectedAnswer = vi.fn()

    useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'answer-1',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer
    })

    await nextTick()

    expect(onClearSelectedAnswer).toHaveBeenCalledTimes(1)
  })

  it('blocks saving when the circle is not approved', async () => {
    formQuery.data.value = buildForm({ currentCircleStatus: 'pending' })

    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    await page.saveAnswer()

    expect(page.errorMessage.value).toBe(page.circleNotApprovedMessage)
    expect(legacyAnswerMutation.mutateAsync).not.toHaveBeenCalled()
    expect(updateAnswerMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('uses the selected-answer mutation when editing an existing answer', async () => {
    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'answer-2',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    await page.saveAnswer()

    expect(updateAnswerMutation.mutateAsync).toHaveBeenCalledWith(draft.value)
    expect(legacyAnswerMutation.mutateAsync).not.toHaveBeenCalled()
    expect(page.errorMessage.value).toBe('')
  })

  it('creates a new answer, selects it, and refetches the selected answer payload', async () => {
    const onSelectAnswer = vi.fn()

    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer,
      onClearSelectedAnswer: vi.fn()
    })

    await page.createAnswer()

    expect(createAnswerMutation.mutateAsync).toHaveBeenCalledTimes(1)
    expect(onSelectAnswer).toHaveBeenCalledWith('answer-created')
    expect(selectedAnswerQuery.refetch).toHaveBeenCalledTimes(1)
    expect(page.errorMessage.value).toBe('')
  })

  it('reports an error when answer creation succeeds without an answer envelope', async () => {
    createAnswerMutation.mutateAsync.mockResolvedValueOnce({ answer: null })

    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    await page.createAnswer()

    expect(page.errorMessage.value).toBe('回答を作成できませんでした。')
    expect(selectedAnswerQuery.refetch).not.toHaveBeenCalled()
  })

  it('validates uploads before sending files', async () => {
    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    await page.uploadFile('q-upload')

    expect(page.uploadErrorMessages.value['q-upload']).toBe('ファイルを選択してください。')
    expect(uploadMutation.mutateAsync).not.toHaveBeenCalled()
  })

  it('stores the selected file and clears it after a successful upload', async () => {
    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'answer-2',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })
    const file = new File(['demo'], 'sample.txt', { type: 'text/plain' })
    const input = document.createElement('input')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: {
        0: file,
        length: 1,
        item: (index: number) => (index === 0 ? file : null)
      }
    })

    page.handleFileChange('q-upload', { target: input } as unknown as Event)
    await page.uploadFile('q-upload')

    expect(uploadMutation.mutateAsync).toHaveBeenCalledWith({
      questionId: 'q-upload',
      file,
      answerId: 'answer-2'
    })
    expect(page.uploadErrorMessages.value['q-upload']).toBe('')
  })

  it('handles invalid file inputs by clearing the staged file', () => {
    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    page.handleFileChange('q-upload', { target: document.createElement('div') } as unknown as Event)

    expect(page.resolveUploadDownloadHref('q-upload')).toBe('/legacy/form-1/')
  })

  it('resolves upload download urls for both selected answers and legacy answers', () => {
    legacyAnswerQuery.data.value = {
      answer: {
        uploads: [
          {
            id: 'upload-1',
            questionId: 'q-upload'
          }
        ]
      }
    }

    const legacyPage = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })
    const selectedPage = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'answer-2',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    expect(legacyPage.resolveUploadDownloadHref('q-upload')).toBe('/legacy/form-1/upload-1')
    expect(selectedPage.resolveUploadDownloadHref('q-upload')).toBe('/answers/form-1/answer-2/q-upload')
  })

  it('surfaces validation errors from failed save and upload mutations', async () => {
    const failure = new Error('failed')
    legacyAnswerMutation.mutateAsync.mockRejectedValueOnce(failure)
    uploadMutation.mutateAsync.mockRejectedValueOnce(failure)
    answersMocks.extractValidationMessage.mockReturnValue('サーバーがエラーを返しました。')

    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })
    const file = new File(['demo'], 'sample.txt', { type: 'text/plain' })
    const input = document.createElement('input')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: {
        0: file,
        length: 1,
        item: () => file
      }
    })

    await page.saveAnswer()
    page.handleFileChange('q-upload', { target: input } as unknown as Event)
    await page.uploadFile('q-upload')

    expect(page.errorMessage.value).toBe('サーバーがエラーを返しました。')
    expect(page.uploadErrorMessages.value['q-upload']).toBe('サーバーがエラーを返しました。')
  })
})
