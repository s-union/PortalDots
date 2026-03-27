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

import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import QuestionEditorCard from '@/components/ui/QuestionEditorCard.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import {
  allowedQuestionTypes,
  extractStaffFormValidationMessage,
  useCreateStaffFormQuestionMutation,
  useDeleteStaffFormQuestionMutation,
  useReorderStaffFormQuestionsMutation,
  useStaffFormDetailQuery,
  useUpdateStaffFormQuestionMutation,
  type StaffFormQuestion
} from '@/features/staff/forms/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'

const route = useRoute('/staff/forms/[formId]/editor')
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const formQuery = useStaffFormDetailQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const createQuestionMutation = useCreateStaffFormQuestionMutation(formId)
const updateQuestionMutation = useUpdateStaffFormQuestionMutation(formId)
const deleteQuestionMutation = useDeleteStaffFormQuestionMutation(formId)
const reorderQuestionMutation = useReorderStaffFormQuestionsMutation(formId)
const questionErrorMessage = ref('')
const newQuestionType = ref<(typeof allowedQuestionTypes)[number]>('text')
const questionEdits = ref<Record<string, StaffFormQuestion>>({})
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'editor'))
const isParticipationForm = computed(() => formQuery.data.value?.isParticipationForm ?? false)

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

async function handleAddQuestion() {
  questionErrorMessage.value = ''

  try {
    await createQuestionMutation.mutateAsync({
      type: newQuestionType.value
    })
  } catch (error) {
    questionErrorMessage.value = extractStaffFormValidationMessage(error)
  }
}

async function handleSaveQuestion(questionId: string) {
  questionErrorMessage.value = ''

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
  } catch (error) {
    questionErrorMessage.value = extractStaffFormValidationMessage(error)
  }
}

async function handleDeleteQuestion(questionId: string) {
  questionErrorMessage.value = ''

  try {
    await deleteQuestionMutation.mutateAsync(questionId)
  } catch (error) {
    questionErrorMessage.value = extractStaffFormValidationMessage(error)
  }
}

async function handleMoveQuestion(questionId: string, direction: -1 | 1) {
  if (!formQuery.data.value) {
    return
  }

  const orderedIds = formQuery.data.value.questions.map((question) => question.id)
  const currentIndex = orderedIds.indexOf(questionId)
  const nextIndex = currentIndex + direction
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) {
    return
  }

  const [currentId] = orderedIds.splice(currentIndex, 1)
  orderedIds.splice(nextIndex, 0, currentId)

  try {
    await reorderQuestionMutation.mutateAsync(orderedIds)
  } catch (error) {
    questionErrorMessage.value = extractStaffFormValidationMessage(error)
  }
}

function updateQuestionOptions(questionId: string, rawValue: string) {
  const question = questionEdits.value[questionId]
  if (!question) {
    return
  }
  question.options = rawValue
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function optionsText(question: StaffFormQuestion) {
  return question.options.join('\n')
}

function updateQuestionNumber(questionId: string, field: 'numberMin' | 'numberMax', event: Event) {
  const target = event.target
  const question = questionEdits.value[questionId]
  if (!(target instanceof HTMLInputElement) || !question) {
    return
  }

  question[field] = target.value === '' ? null : Number(target.value)
}

function handleQuestionOptionsInput(questionId: string, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }

  updateQuestionOptions(questionId, target.value)
}
</script>

<template>
  <PageLayout>
    <BackLink to="/staff/forms"> フォーム管理へ戻る </BackLink>

    <div v-if="formQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="formQuery.data.value" class="space-y-6">
      <TabStrip :tabs="staffFormTabs" />

      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Form Editor</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">エディター</h2>
        <div class="mt-3 text-sm text-muted">フォームID : {{ formQuery.data.value.id }}</div>
        <p v-if="isParticipationForm" class="mt-3 text-sm text-muted">
          このフォームは参加登録フォームです。設問編集のみ行えます。
        </p>
      </SurfaceCard>

      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-medium text-body">設問エディタ</h3>
              <p class="mt-2 text-sm text-muted-2">設問の追加、編集、削除、並び替えをここで行います。</p>
            </div>
            <div class="flex flex-wrap gap-3">
              <select
                v-model="newQuestionType"
                class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              >
                <option v-for="questionType in allowedQuestionTypes" :key="questionType" :value="questionType">
                  {{ questionType }}
                </option>
              </select>
              <button
                class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
                type="button"
                @click="handleAddQuestion"
              >
                設問を追加
              </button>
            </div>
          </div>
        </div>

        <AlertMessage v-if="questionErrorMessage" class="mx-6 mt-4">{{ questionErrorMessage }}</AlertMessage>

        <div
          v-if="formQuery.data.value.questions.length === 0"
          class="mx-6 my-5 rounded border border-border bg-surface-light p-4 text-sm text-muted-2"
        >
          設問はまだありません。
        </div>

        <div v-else class="grid gap-4 px-6 py-5">
          <QuestionEditorCard
            v-for="{ question, edit } in editableQuestions"
            :key="question.id"
            :meta="`#${question.priority} / ${question.type}`"
            :title="edit.name || '(無題の設問)'"
          >
            <template #actions>
              <button
                class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                type="button"
                @click="handleMoveQuestion(question.id, -1)"
              >
                上へ
              </button>
              <button
                class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                type="button"
                @click="handleMoveQuestion(question.id, 1)"
              >
                下へ
              </button>
              <button
                class="rounded border border-primary px-3 py-2 text-xs text-primary transition hover:bg-primary-light"
                type="button"
                @click="handleSaveQuestion(question.id)"
              >
                保存
              </button>
              <button
                class="rounded border border-danger px-3 py-2 text-xs text-danger transition hover:bg-danger-light"
                type="button"
                @click="handleDeleteQuestion(question.id)"
              >
                削除
              </button>
            </template>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>設問名</span>
                <input
                  v-model="edit.name"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="text"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>設問タイプ</span>
                <select
                  v-model="edit.type"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                >
                  <option v-for="questionType in allowedQuestionTypes" :key="questionType" :value="questionType">
                    {{ questionType }}
                  </option>
                </select>
              </label>
            </div>

            <label class="grid gap-2 text-sm text-body">
              <span>説明</span>
              <textarea
                v-model="edit.description"
                class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              />
            </label>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>数値最小値</span>
                <input
                  :value="edit.numberMin ?? ''"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="number"
                  @input="updateQuestionNumber(question.id, 'numberMin', $event)"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>数値最大値</span>
                <input
                  :value="edit.numberMax ?? ''"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  type="number"
                  @input="updateQuestionNumber(question.id, 'numberMax', $event)"
                />
              </label>
            </div>

            <label class="grid gap-2 text-sm text-body">
              <span>upload 許可拡張子</span>
              <input
                v-model="edit.allowedTypes"
                class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                type="text"
              />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span>選択肢</span>
              <textarea
                :value="optionsText(edit)"
                class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                @input="handleQuestionOptionsInput(question.id, $event)"
              />
            </label>

            <label class="flex items-center gap-3 text-sm text-body">
              <input v-model="edit.isRequired" type="checkbox" />
              必須にする
            </label>
          </QuestionEditorCard>
        </div>
      </section>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      フォームを取得できませんでした。
    </div>
  </PageLayout>
</template>
