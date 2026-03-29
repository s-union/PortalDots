<script setup lang="ts">
definePage({
  path: '/staff/forms/:formId/editor',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'forms.edit'
  }
})

import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TabStrip from '@/components/ui/TabStrip.vue'
import FormEditorSidebar from '@/components/staff/forms/editor/FormEditorSidebar.vue'
import FormQuestionPreviewItem from '@/components/staff/forms/editor/FormQuestionPreviewItem.vue'
import { usePublicConfigQuery } from '@/features/public-home/api'
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
import { useSessionStore } from '@/features/session/store'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'

const route = useRoute('/staff/forms/[formId]/editor')
const router = useRouter()
const sessionStore = useSessionStore()
const publicConfigQuery = usePublicConfigQuery()

const formId = computed(() => String(route.params.formId ?? ''))
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
    .filter(
      (
        value
      ): value is {
        question: StaffFormQuestion
        edit: StaffFormQuestion
      } => value.edit !== undefined
    )
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

async function handleAddQuestion(type: AllowedQuestionType) {
  editorErrorMessage.value = ''

  try {
    const newQuestion = await createQuestionMutation.mutateAsync({ type })
    openQuestionId.value = newQuestion.id
    markSaved()
  } catch (error) {
    editorErrorMessage.value = extractStaffFormValidationMessage(error)
  }
}

async function handleSaveQuestion(questionId: string) {
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

async function handleDeleteQuestion(questionId: string) {
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

async function handleMoveQuestion(questionId: string, direction: -1 | 1) {
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

function handleQuestionDragStart(questionId: string) {
  draggingQuestionId.value = questionId
  dropTargetQuestionId.value = null
}

function handleQuestionDragOver(questionId: string) {
  if (!draggingQuestionId.value || draggingQuestionId.value === questionId) {
    return
  }
  dropTargetQuestionId.value = questionId
}

async function handleQuestionDrop(questionId: string) {
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

function navigateToSettings() {
  router.push(`/staff/forms/${formId.value}/edit`)
}
</script>

<template>
  <section class="pb-6">
    <div v-if="formQuery.isPending.value" class="px-6 pt-6 max-[1000px]:px-4">
      <div class="rounded border border-border bg-surface px-6 py-5 text-muted shadow-lv1">読み込み中...</div>
    </div>

    <template v-else-if="formQuery.data.value">
      <TabStrip :tabs="staffFormTabs" />

      <div
        class="fixed bottom-0 left-0 right-0 z-[9975] border-t border-danger bg-danger-light px-6 py-3 text-center text-sm text-danger shadow-lv1 min-[1001px]:hidden"
      >
        フォームエディターは、パソコンのみ対応しています。
      </div>

      <div class="overflow-hidden border-y border-border bg-surface shadow-lv1">
        <div class="grid min-h-[calc(100vh-14rem)] lg:grid-cols-[minmax(0,1fr)_300px]">
          <section class="min-w-0 bg-surface-light">
            <header
              class="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface-2 px-6 max-[1000px]:px-4"
            >
              <div class="w-40 shrink-0 text-sm font-medium text-body">フォームエディター</div>
              <div class="min-h-5 flex-1 text-center text-sm" :class="statusToneClass">
                {{ statusMessage }}
              </div>
              <div v-if="!isParticipationForm" class="flex shrink-0 items-center gap-3 max-[1000px]:gap-2">
                <a :href="previewUrl" target="_blank" class="text-sm text-primary hover:underline">プレビュー</a>
                <span
                  class="rounded px-2 py-0.5 text-xs font-bold text-white"
                  :class="isPublic ? 'bg-primary' : 'bg-danger'"
                >
                  {{ isPublic ? '公開' : '非公開' }}
                </span>
                <button
                  class="rounded px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-80"
                  :class="isPublic ? 'bg-danger' : 'bg-primary'"
                  :disabled="updateFormMutation.isPending.value"
                  type="button"
                  @click="isPublic ? setPrivate() : setPublic()"
                >
                  {{ isPublic ? '非公開にする' : '公開する' }}
                </button>
              </div>
            </header>

            <div class="px-6 py-12 max-[1000px]:px-4 max-[1000px]:py-8">
              <div class="mx-auto w-full max-w-[960px] bg-surface shadow-lv1">
                <div
                  class="cursor-pointer border-b border-border px-6 py-6 transition-colors hover:bg-surface-light"
                  :title="'「設定」タブでフォームのタイトルと説明を編集できます'"
                  @click="navigateToSettings"
                >
                  <h1 class="text-2xl font-bold text-body">
                    {{ formQuery.data.value.name || '(無題のフォーム)' }}
                  </h1>
                  <p
                    v-if="formQuery.data.value.description"
                    class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted"
                  >
                    {{ formQuery.data.value.description }}
                  </p>
                  <p class="mt-3 text-xs text-muted-2">※ タイトルと説明を変更するには「設定」タブへ</p>
                </div>

                <div v-if="editableQuestions.length === 0" class="px-6 py-16 text-center text-muted">
                  <p class="text-4xl">✎</p>
                  <p class="mt-5 text-lg font-medium text-body">右側の[設問を追加]から設問を追加しましょう</p>
                  <p class="mt-2 text-sm text-muted-2">このフォームには設問が1つもありません。</p>
                </div>

                <div v-else>
                  <FormQuestionPreviewItem
                    v-for="{ question, edit } in editableQuestions"
                    :key="question.id"
                    :question="question"
                    :edit="edit"
                    :is-open="openQuestionId === question.id"
                    :draggable="!isSaving"
                    :is-dragging="draggingQuestionId === question.id"
                    :is-drop-target="dropTargetQuestionId === question.id"
                    @toggle="toggleQuestion(question.id)"
                    @save="handleSaveQuestion(question.id)"
                    @delete="handleDeleteQuestion(question.id)"
                    @drag-start="handleQuestionDragStart(question.id)"
                    @drag-end="clearDragState()"
                    @drag-over="handleQuestionDragOver(question.id)"
                    @drop="handleQuestionDrop(question.id)"
                    @update:edit="
                      (value) => {
                        questionEdits[question.id] = value
                      }
                    "
                  >
                    <template #move-actions>
                      <button
                        class="rounded border border-border px-3 py-1.5 text-xs text-body transition hover:bg-surface-light"
                        type="button"
                        @click="handleMoveQuestion(question.id, -1)"
                      >
                        ↑ 上へ
                      </button>
                      <button
                        class="rounded border border-border px-3 py-1.5 text-xs text-body transition hover:bg-surface-light"
                        type="button"
                        @click="handleMoveQuestion(question.id, 1)"
                      >
                        ↓ 下へ
                      </button>
                    </template>
                  </FormQuestionPreviewItem>
                </div>
              </div>
            </div>
          </section>

          <div class="border-t border-border lg:border-l lg:border-t-0">
            <div class="lg:sticky lg:top-16 lg:h-[calc(100vh-9rem)]">
              <FormEditorSidebar class="h-full" @add-question="handleAddQuestion" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="mx-6 mt-6 rounded border border-danger bg-danger-light px-6 py-5 text-danger max-[1000px]:mx-4">
      フォームを取得できませんでした。
    </div>
  </section>
</template>
