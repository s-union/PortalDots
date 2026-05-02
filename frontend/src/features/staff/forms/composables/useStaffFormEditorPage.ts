import { computed, onBeforeUnmount, ref, watch, watchEffect, type MaybeRefOrGetter, toValue } from 'vue'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { useSessionStore } from '@/features/session/store'
import {
  extractStaffFormValidationMessage,
  useCreateStaffFormQuestionMutation,
  useDeleteStaffFormQuestionMutation,
  useReorderStaffFormQuestionsMutation,
  useStaffFormDetailQuery,
  useUpdateStaffFormMutation,
  useUpdateStaffFormQuestionMutation,
  type StaffFormQuestion
} from '@/features/staff/forms/api'
import type { AllowedQuestionType } from '@/features/staff/forms/editor/useQuestionTypeMeta'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { buildStaffFormTabs } from '@/lib/ui/tabStrip'

export function useStaffFormEditorPage(
  formIdValue: MaybeRefOrGetter<string>,
  options: { navigateToSettings: () => void }
) {
  const formId = computed(() => toValue(formIdValue))
  const sessionStore = useSessionStore()
  const publicConfigQuery = usePublicConfigQuery()
  const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
  const formQuery = useStaffFormDetailQuery(
    formId,
    computed(() => staffStatusQuery.data.value?.authorized === true)
  )
  const createQuestionMutation = useCreateStaffFormQuestionMutation(formId)
  const updateQuestionMutation = useUpdateStaffFormQuestionMutation(formId)
  const updateFormMutation = useUpdateStaffFormMutation(formId)
  const deleteQuestionMutation = useDeleteStaffFormQuestionMutation(formId)
  const reorderQuestionMutation = useReorderStaffFormQuestionsMutation(formId)

  const editorErrorMessage = ref('')
  const questionEdits = ref<Record<string, StaffFormQuestion>>({})
  const openQuestionId = ref<string | null>(null)
  const draggingQuestionId = ref<string | null>(null)
  const dropTargetQuestionId = ref<string | null>(null)
  const savedMessageVisible = ref(false)

  let savedMessageTimer: number | undefined = undefined

  const isParticipationForm = computed(() => formQuery.data.value?.isParticipationForm ?? false)
  const isPublic = computed(() => formQuery.data.value?.isPublic ?? false)
  const previewUrl = computed(() => `/staff/forms/${formId.value}/preview`)
  const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'editor'))
  const editorPageTitle = computed(() => {
    const formName = formQuery.data.value?.name?.trim()
    return formName ? `${formName} - フォームエディター` : 'フォームエディター'
  })
  const isSaving = computed(
    () =>
      createQuestionMutation.isPending.value ||
      updateQuestionMutation.isPending.value ||
      updateFormMutation.isPending.value ||
      deleteQuestionMutation.isPending.value ||
      reorderQuestionMutation.isPending.value
  )

  const editableQuestions = computed(() =>
    (formQuery.data.value?.questions ?? [])
      .map((question) => ({
        question,
        edit: questionEdits.value[question.id]
      }))
      .filter((value): value is { question: StaffFormQuestion; edit: StaffFormQuestion } => value.edit !== undefined)
  )

  const statusToneClass = computed(() => {
    if (editorErrorMessage.value) {
      return 'text-danger'
    }
    if (savedMessageVisible.value) {
      return 'text-success'
    }
    return 'text-muted'
  })

  const statusMessage = computed(() => {
    if (editorErrorMessage.value) {
      return editorErrorMessage.value
    }
    if (isSaving.value) {
      return '保存中...'
    }
    if (savedMessageVisible.value) {
      return '保存しました'
    }
    return ''
  })

  watch(
    () => formQuery.data.value,
    (value) => {
      if (!value) {
        return
      }

      questionEdits.value = Object.fromEntries(
        value.questions.map((question) => [question.id, { ...question, options: [...question.options] }])
      )
    },
    { immediate: true }
  )

  watchEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const appName = publicConfigQuery.data.value?.appName ?? 'PortalDots'
    document.title = `${editorPageTitle.value} — ${appName}`
  })

  onBeforeUnmount(() => {
    if (savedMessageTimer !== undefined) {
      window.clearTimeout(savedMessageTimer)
    }
  })

  function clearDragState() {
    draggingQuestionId.value = null
    dropTargetQuestionId.value = null
  }

  function markSaved() {
    savedMessageVisible.value = true
    if (savedMessageTimer !== undefined) {
      window.clearTimeout(savedMessageTimer)
    }
    savedMessageTimer = window.setTimeout(() => {
      savedMessageVisible.value = false
    }, 3000)
  }

  function toggleQuestion(questionId: string) {
    openQuestionId.value = openQuestionId.value === questionId ? null : questionId
  }

  function questionIdsAfterReorder(sourceQuestionId: string, targetQuestionId: string) {
    const orderedIds = (formQuery.data.value?.questions ?? []).map((question) => question.id)
    const sourceIndex = orderedIds.indexOf(sourceQuestionId)
    const targetIndex = orderedIds.indexOf(targetQuestionId)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return null
    }

    const nextIds = [...orderedIds]
    nextIds.splice(sourceIndex, 1)
    nextIds.splice(targetIndex, 0, sourceQuestionId)
    return nextIds
  }

  async function setPublic() {
    editorErrorMessage.value = ''
    if (!window.confirm('公開しますか？\n公開しても受付期間外の場合、団体は回答できません。')) {
      return
    }

    const form = formQuery.data.value
    if (!form) {
      return
    }

    try {
      await updateFormMutation.mutateAsync({
        circleId: form.circle.id,
        name: form.name,
        description: form.description,
        openAt: form.openAt,
        closeAt: form.closeAt,
        maxAnswers: form.maxAnswers,
        answerableTags: form.answerableTags,
        confirmationMessage: form.confirmationMessage,
        isPublic: true
      })
      markSaved()
    } catch (error) {
      editorErrorMessage.value = extractStaffFormValidationMessage(error)
    }
  }

  async function setPrivate() {
    editorErrorMessage.value = ''
    if (!window.confirm('非公開にしますか？')) {
      return
    }

    const form = formQuery.data.value
    if (!form) {
      return
    }

    try {
      await updateFormMutation.mutateAsync({
        circleId: form.circle.id,
        name: form.name,
        description: form.description,
        openAt: form.openAt,
        closeAt: form.closeAt,
        maxAnswers: form.maxAnswers,
        answerableTags: form.answerableTags,
        confirmationMessage: form.confirmationMessage,
        isPublic: false
      })
      markSaved()
    } catch (error) {
      editorErrorMessage.value = extractStaffFormValidationMessage(error)
    }
  }

  async function addQuestion(type: AllowedQuestionType) {
    editorErrorMessage.value = ''

    try {
      const newQuestion = await createQuestionMutation.mutateAsync({ type })
      openQuestionId.value = newQuestion.id
      markSaved()
    } catch (error) {
      editorErrorMessage.value = extractStaffFormValidationMessage(error)
    }
  }

  async function saveQuestion(questionId: string) {
    editorErrorMessage.value = ''

    try {
      const question = questionEdits.value[questionId]
      if (!question) {
        return
      }

      await updateQuestionMutation.mutateAsync({
        id: question.id,
        name: question.name,
        description: question.description,
        type: question.type,
        isRequired: question.isRequired,
        numberMin: question.numberMin,
        numberMax: question.numberMax,
        allowedTypes: question.allowedTypes,
        options: question.options,
        priority: question.priority
      })
      markSaved()
    } catch (error) {
      editorErrorMessage.value = extractStaffFormValidationMessage(error)
    }
  }

  async function deleteQuestion(questionId: string) {
    editorErrorMessage.value = ''

    try {
      await deleteQuestionMutation.mutateAsync(questionId)
      if (openQuestionId.value === questionId) {
        openQuestionId.value = null
      }
      markSaved()
    } catch (error) {
      editorErrorMessage.value = extractStaffFormValidationMessage(error)
    }
  }

  async function moveQuestion(questionId: string, direction: -1 | 1) {
    const orderedIds = (formQuery.data.value?.questions ?? []).map((question) => question.id)
    const currentIndex = orderedIds.indexOf(questionId)
    const nextIndex = currentIndex + direction
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) {
      return
    }

    orderedIds.splice(currentIndex, 1)
    orderedIds.splice(nextIndex, 0, questionId)

    editorErrorMessage.value = ''
    try {
      await reorderQuestionMutation.mutateAsync(orderedIds)
      markSaved()
    } catch (error) {
      editorErrorMessage.value = extractStaffFormValidationMessage(error)
    }
  }

  function startQuestionDrag(questionId: string) {
    draggingQuestionId.value = questionId
    dropTargetQuestionId.value = null
  }

  function dragOverQuestion(questionId: string) {
    if (!draggingQuestionId.value || draggingQuestionId.value === questionId) {
      return
    }
    dropTargetQuestionId.value = questionId
  }

  async function dropQuestion(questionId: string) {
    if (!draggingQuestionId.value) {
      return
    }

    const nextIds = questionIdsAfterReorder(draggingQuestionId.value, questionId)
    clearDragState()
    if (!nextIds) {
      return
    }

    editorErrorMessage.value = ''
    try {
      await reorderQuestionMutation.mutateAsync(nextIds)
      markSaved()
    } catch (error) {
      editorErrorMessage.value = extractStaffFormValidationMessage(error)
    }
  }

  function updateQuestionEdit(questionId: string, value: StaffFormQuestion) {
    questionEdits.value[questionId] = value
  }

  return {
    addQuestion,
    clearDragState,
    createQuestionMutation,
    deleteQuestion,
    deleteQuestionMutation,
    dragOverQuestion,
    draggingQuestionId,
    dropQuestion,
    dropTargetQuestionId,
    editableQuestions,
    formQuery,
    isParticipationForm,
    isPublic,
    isSaving,
    moveQuestion,
    navigateToSettings: options.navigateToSettings,
    openQuestionId,
    previewUrl,
    reorderQuestionMutation,
    saveQuestion,
    setPrivate,
    setPublic,
    staffFormTabs,
    startQuestionDrag,
    statusMessage,
    statusToneClass,
    toggleQuestion,
    updateFormMutation,
    updateQuestionEdit
  }
}
