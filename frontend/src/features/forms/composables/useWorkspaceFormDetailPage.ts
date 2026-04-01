import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useFormDetailQuery } from '@/features/forms/api'
import {
  buildFormAnswerUploadDownloadUrl,
  buildFormAnswerUploadDownloadUrlByAnswer,
  extractValidationMessage,
  useCreateFormAnswerMutation,
  useFormAnswerByIdQuery,
  useFormAnswerEditorDraft,
  useFormAnswerMutation,
  useFormAnswerQuery,
  useFormAnswerUploadMutation,
  useFormAnswersQuery,
  useUpdateFormAnswerMutation
} from '@/features/forms/answers'

interface UseWorkspaceFormDetailPageOptions {
  formId: MaybeRefOrGetter<string>
  selectedAnswerId: MaybeRefOrGetter<string>
  onSelectAnswer: (answerId: string) => Promise<void> | void
  onClearSelectedAnswer: () => Promise<void> | void
}

export function useWorkspaceFormDetailPage(options: UseWorkspaceFormDetailPageOptions) {
  const formId = computed(() => toValue(options.formId))
  const selectedAnswerId = computed(() => toValue(options.selectedAnswerId))
  const formQuery = useFormDetailQuery(formId)
  const answersQuery = useFormAnswersQuery(formId)
  const legacyAnswerQuery = useFormAnswerQuery(formId)
  const selectedAnswerQuery = useFormAnswerByIdQuery(formId, selectedAnswerId)
  const questions = computed(() => formQuery.data.value?.questions ?? [])
  const selectedAnswer = computed(() => {
    if (selectedAnswerId.value) {
      return selectedAnswerQuery.data.value?.answer ?? null
    }
    return legacyAnswerQuery.data.value?.answer ?? null
  })
  const draft = useFormAnswerEditorDraft(selectedAnswer, questions)
  const createAnswerMutation = useCreateFormAnswerMutation(formId)
  const legacyAnswerMutation = useFormAnswerMutation(formId)
  const answerMutation = useUpdateFormAnswerMutation(formId, selectedAnswerId)
  const uploadMutation = useFormAnswerUploadMutation(formId)
  const errorMessage = ref('')
  const uploadErrorMessages = ref<Record<string, string>>({})
  const selectedFiles = ref<Record<string, File | null>>({})

  const form = computed(() => formQuery.data.value)
  const isCircleApproved = computed(() => form.value?.currentCircleStatus === 'approved')
  const isFormWritable = computed(() => form.value?.isOpen === true && isCircleApproved.value)
  const answers = computed(() => answersQuery.data.value?.answers ?? [])
  const isLimitedPublic = computed(() => (form.value?.answerableTags.length ?? 0) > 0)
  const confirmationMessage = computed(() => form.value?.confirmationMessage?.trim() ?? '')
  const hasReachedAnswerLimit = computed(() => {
    const maxAnswers = formQuery.data.value?.maxAnswers ?? 1
    return answers.value.length >= maxAnswers
  })
  const isSavingAnswer = computed(() => {
    if (selectedAnswerId.value) {
      return answerMutation.isPending.value
    }
    return legacyAnswerMutation.isPending.value
  })
  const circleNotApprovedMessage = '企画が受理されていないため申請できません。'

  watch(
    [answers, selectedAnswerId],
    async ([currentAnswers, currentSelectedAnswerId]) => {
      if (currentAnswers.length === 0) {
        if (!currentSelectedAnswerId) {
          return
        }

        await options.onClearSelectedAnswer()
        return
      }

      const hasSelectedAnswer = currentAnswers.some((answer) => answer.id === currentSelectedAnswerId)
      if (hasSelectedAnswer) {
        return
      }

      await options.onSelectAnswer(currentAnswers[0].id)
    },
    { immediate: true }
  )

  async function saveAnswer() {
    if (!isFormWritable.value) {
      if (!isCircleApproved.value) {
        errorMessage.value = circleNotApprovedMessage
      }
      return
    }
    errorMessage.value = ''

    try {
      if (selectedAnswerId.value) {
        await answerMutation.mutateAsync(draft.value)
      } else {
        await legacyAnswerMutation.mutateAsync(draft.value)
      }
    } catch (error) {
      errorMessage.value = extractValidationMessage(error)
    }
  }

  async function createAnswer() {
    if (!isFormWritable.value) {
      if (!isCircleApproved.value) {
        errorMessage.value = circleNotApprovedMessage
      }
      return
    }
    errorMessage.value = ''

    try {
      const envelope = await createAnswerMutation.mutateAsync()
      const createdAnswer = envelope.answer
      if (!createdAnswer) {
        errorMessage.value = '回答を作成できませんでした。'
        return
      }
      await options.onSelectAnswer(createdAnswer.id)
      await selectedAnswerQuery.refetch()
    } catch (error) {
      errorMessage.value = extractValidationMessage(error)
    }
  }

  async function uploadFile(questionId: string) {
    if (!isFormWritable.value) {
      uploadErrorMessages.value = {
        ...uploadErrorMessages.value,
        [questionId]: !isCircleApproved.value ? circleNotApprovedMessage : '受付期間外のため申請できません。'
      }
      return
    }
    uploadErrorMessages.value = { ...uploadErrorMessages.value, [questionId]: '' }
    const file = selectedFiles.value[questionId]
    if (!file) {
      uploadErrorMessages.value = {
        ...uploadErrorMessages.value,
        [questionId]: 'ファイルを選択してください。'
      }
      return
    }

    try {
      await uploadMutation.mutateAsync({
        questionId,
        file,
        answerId: selectedAnswerId.value || undefined
      })
      selectedFiles.value = { ...selectedFiles.value, [questionId]: null }
    } catch (error) {
      uploadErrorMessages.value = {
        ...uploadErrorMessages.value,
        [questionId]: extractValidationMessage(error)
      }
    }
  }

  function handleFileChange(questionId: string, event: Event) {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) {
      selectedFiles.value = { ...selectedFiles.value, [questionId]: null }
      return
    }

    const files = target.files
    selectedFiles.value = {
      ...selectedFiles.value,
      [questionId]: files?.[0] ?? files?.item(0) ?? null
    }
  }

  function resolveUploadDownloadHref(questionId: string) {
    if (selectedAnswerId.value) {
      return buildFormAnswerUploadDownloadUrlByAnswer(formId.value, selectedAnswerId.value, questionId)
    }

    const uploadId = (selectedAnswer.value?.uploads ?? []).find((upload) => upload.questionId === questionId)?.id ?? ''
    return buildFormAnswerUploadDownloadUrl(formId.value, uploadId)
  }

  async function selectAnswer(answerId: string) {
    await options.onSelectAnswer(answerId)
  }

  return {
    answers,
    circleNotApprovedMessage,
    confirmationMessage,
    createAnswer,
    createAnswerMutation,
    draft,
    errorMessage,
    form,
    formQuery,
    handleFileChange,
    hasReachedAnswerLimit,
    isCircleApproved,
    isFormWritable,
    isLimitedPublic,
    isSavingAnswer,
    resolveUploadDownloadHref,
    saveAnswer,
    selectAnswer,
    selectedAnswer,
    selectedAnswerId,
    uploadErrorMessages,
    uploadFile,
    uploadMutation
  }
}
