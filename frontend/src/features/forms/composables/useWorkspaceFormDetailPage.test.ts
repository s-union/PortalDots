import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import type { FormAnswerDraft } from '@/features/forms/answers'

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
  const draft: FormAnswerDraft = { 'q-text': '入力した回答' }
  const savedAnswer = {
    id: 'answer-saved',
    body: '',
    updatedAt: '2026-03-02T00:00:00Z',
    details: { 'q-text': ['入力した回答'] },
    uploads: []
  }
  const formQuery = {
    data: ref(buildForm()),
    isPending: ref(false)
  }
  const answersQuery = {
    data: ref<{ answers: { id: string }[] } | undefined>({ answers: [] })
  }
  const legacyAnswerQuery = {
    data: ref<{ answer: Record<string, unknown> | null }>({ answer: null })
  }
  const selectedAnswerQuery = {
    data: ref<{ answer: Record<string, unknown> | null } | undefined>({ answer: null }),
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
    legacyAnswerMutation.mutateAsync.mockResolvedValue({ answer: savedAnswer })
    updateAnswerMutation.mutateAsync.mockResolvedValue({ answer: savedAnswer })
    uploadMutation.mutateAsync.mockResolvedValue(undefined)

    formApiMocks.useFormDetailQuery.mockReturnValue(formQuery)
    answersMocks.useFormAnswersQuery.mockReturnValue(answersQuery)
    answersMocks.useFormAnswerQuery.mockReturnValue(legacyAnswerQuery)
    answersMocks.useFormAnswerByIdQuery.mockReturnValue(selectedAnswerQuery)
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

  it('preserves the selected answer while the answer list is loading and after it arrives', async () => {
    const onSelectAnswer = vi.fn()
    const onClearSelectedAnswer = vi.fn()
    answersQuery.data.value = undefined

    useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'answer-1',
      onSelectAnswer,
      onClearSelectedAnswer
    })

    await nextTick()
    expect(onSelectAnswer).not.toHaveBeenCalled()
    expect(onClearSelectedAnswer).not.toHaveBeenCalled()

    answersQuery.data.value = {
      answers: [{ id: 'answer-2' }, { id: 'answer-1' }]
    }
    await nextTick()

    expect(onSelectAnswer).not.toHaveBeenCalled()
    expect(onClearSelectedAnswer).not.toHaveBeenCalled()
  })

  it('uses the matching legacy answer until the selected answer response arrives', () => {
    const legacyAnswer = { ...savedAnswer, id: 'answer-1', body: 'Legacy cached answer' }
    legacyAnswerQuery.data.value = { answer: legacyAnswer }
    selectedAnswerQuery.data.value = undefined

    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'answer-1',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    expect(page.selectedAnswer.value).toEqual(legacyAnswer)

    const fetchedAnswer = { ...legacyAnswer, body: 'Selected answer response' }
    selectedAnswerQuery.data.value = { answer: fetchedAnswer }

    expect(page.selectedAnswer.value).toEqual(fetchedAnswer)
  })

  it('does not use a legacy answer belonging to a different selected answer ID', () => {
    legacyAnswerQuery.data.value = { answer: { ...savedAnswer, id: 'answer-2' } }
    selectedAnswerQuery.data.value = undefined

    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'answer-1',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    expect(page.selectedAnswer.value).toBeNull()
  })

  it('preserves an explicit null selected answer even when a matching legacy answer exists', () => {
    legacyAnswerQuery.data.value = { answer: { ...savedAnswer, id: 'answer-1' } }
    selectedAnswerQuery.data.value = { answer: null }

    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: 'answer-1',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    expect(page.selectedAnswer.value).toBeNull()
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

    const result = await page.saveAnswer(draft)

    expect(result).toBeNull()
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

    const result = await page.saveAnswer(draft)

    expect(updateAnswerMutation.mutateAsync).toHaveBeenCalledWith(draft)
    expect(legacyAnswerMutation.mutateAsync).not.toHaveBeenCalled()
    expect(page.errorMessage.value).toBe('')
    expect(result).toEqual(savedAnswer)
  })

  it('saves the caller-supplied draft through the legacy mutation without a selected answer', async () => {
    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    const result = await page.saveAnswer(draft)

    expect(legacyAnswerMutation.mutateAsync).toHaveBeenCalledWith(draft)
    expect(updateAnswerMutation.mutateAsync).not.toHaveBeenCalled()
    expect(result).toEqual(savedAnswer)
  })

  it('blocks saving outside the acceptance period', async () => {
    formQuery.data.value = buildForm({ isOpen: false })
    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    expect(await page.saveAnswer(draft)).toBeNull()
    expect(legacyAnswerMutation.mutateAsync).not.toHaveBeenCalled()
    expect(updateAnswerMutation.mutateAsync).not.toHaveBeenCalled()
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

    page.handleFileChange('q-upload', file)
    await page.uploadFile('q-upload')

    expect(uploadMutation.mutateAsync).toHaveBeenCalledWith({
      questionId: 'q-upload',
      file,
      answerId: 'answer-2'
    })
    expect(page.uploadErrorMessages.value['q-upload']).toBe('')
  })

  it('clears the staged file when passed null', async () => {
    const page = useWorkspaceFormDetailPage({
      formId: 'form-1',
      selectedAnswerId: '',
      onSelectAnswer: vi.fn(),
      onClearSelectedAnswer: vi.fn()
    })

    page.handleFileChange('q-upload', new File(['demo'], 'sample.txt'))
    page.handleFileChange('q-upload', null)
    await page.uploadFile('q-upload')

    expect(page.uploadErrorMessages.value['q-upload']).toBe('ファイルを選択してください。')
    expect(uploadMutation.mutateAsync).not.toHaveBeenCalled()
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

    const result = await page.saveAnswer(draft)
    page.handleFileChange('q-upload', file)
    await page.uploadFile('q-upload')

    expect(page.errorMessage.value).toBe('サーバーがエラーを返しました。')
    expect(page.uploadErrorMessages.value['q-upload']).toBe('サーバーがエラーを返しました。')
    expect(result).toBeNull()
  })
})
