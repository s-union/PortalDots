import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useFormDetailQuery } from '@/features/forms/api'
import {
  buildFormAnswerUploadDownloadUrl,
  buildFormAnswerUploadDownloadUrlByAnswer,
  extractValidationMessage,
  useCreateFormAnswerMutation,
  useFormAnswerByIdQuery,
  useFormAnswerMutation,
  useFormAnswerQuery,
  useFormAnswerUploadMutation,
  useFormAnswersQuery,
  useUpdateFormAnswerMutation,
  type FormAnswer,
  type FormAnswerDraft
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
  const selectedAnswer = computed(() => {
    if (selectedAnswerId.value) {
      const selected = selectedAnswerQuery.data.value
      if (selected) {
        return selected.answer
      }
      // The first save selects the new answer before its by-ID query resolves.
      const savedAnswer = legacyAnswerQuery.data.value?.answer
      return savedAnswer?.id === selectedAnswerId.value ? savedAnswer : null
    }
    return legacyAnswerQuery.data.value?.answer ?? null
  })

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
  const circleNotApprovedMessage = '企画が受理されていないため申請できません。'

  watch(
    [answers, selectedAnswerId],
    async ([currentAnswers, currentSelectedAnswerId]) => {
      if (!answersQuery.data.value) {
        return
      }

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

  async function saveAnswer(draft: FormAnswerDraft): Promise<FormAnswer | null> {
    if (!isFormWritable.value) {
      if (!isCircleApproved.value) {
        errorMessage.value = circleNotApprovedMessage
      }
      return null
    }
    errorMessage.value = ''

    try {
      const result = selectedAnswerId.value
        ? await answerMutation.mutateAsync(draft)
        : await legacyAnswerMutation.mutateAsync(draft)
      return result.answer
    } catch (error) {
      errorMessage.value = extractValidationMessage(error)
      return null
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

  function handleFileChange(questionId: string, file: File | null) {
    selectedFiles.value = { ...selectedFiles.value, [questionId]: file }
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
    errorMessage,
    form,
    formQuery,
    handleFileChange,
    hasReachedAnswerLimit,
    isCircleApproved,
    isFormWritable,
    isLimitedPublic,
    resolveUploadDownloadHref,
    saveAnswer,
    selectAnswer,
    selectedAnswer,
    selectedAnswerId,
    selectedFiles,
    uploadErrorMessages,
    uploadFile,
    uploadMutation
  }
}
