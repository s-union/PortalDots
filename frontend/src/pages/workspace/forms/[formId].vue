<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnswerQuestionFields from '@/components/forms/AnswerQuestionFields.vue'
import { useFormDetailQuery } from '@/features/forms/api'
import {
  buildFormAnswerUploadDownloadUrlByAnswer,
  buildFormAnswerUploadDownloadUrl,
  extractValidationMessage,
  updateDraftValue,
  useFormAnswerMutation,
  useFormAnswerQuery,
  useCreateFormAnswerMutation,
  useFormAnswerByIdQuery,
  useFormAnswerEditorDraft,
  useFormAnswersQuery,
  useFormAnswerUploadMutation,
  useUpdateFormAnswerMutation
} from '@/features/forms/answers'
import { useSessionStore } from '@/features/session/store'

const route = useRoute('/workspace/forms/[formId]')
const router = useRouter()
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const circleSelectorLink = computed(() => `/circles/select?redirect=${encodeURIComponent(route.fullPath)}`)
const formQuery = useFormDetailQuery(formId)
const answersQuery = useFormAnswersQuery(formId)
const legacyAnswerQuery = useFormAnswerQuery(formId)
const selectedAnswerId = computed(() => {
  const answer = route.query.answer
  return typeof answer === 'string' ? answer : ''
})
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

const isDisabled = computed(() => formQuery.data.value?.isOpen !== true)
const answers = computed(() => answersQuery.data.value?.answers ?? [])
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

watch(
  [answers, selectedAnswerId],
  async ([currentAnswers, currentSelectedAnswerId]) => {
    if (currentAnswers.length === 0) {
      if (!currentSelectedAnswerId) {
        return
      }

      const nextQuery = { ...route.query }
      delete nextQuery.answer
      await router.replace({ query: nextQuery })
      return
    }

    const hasSelectedAnswer = currentAnswers.some((answer) => answer.id === currentSelectedAnswerId)
    if (hasSelectedAnswer) {
      return
    }

    await router.replace({
      query: {
        ...route.query,
        answer: currentAnswers[0].id
      }
    })
  },
  { immediate: true }
)

async function handleSaveAnswer() {
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

async function handleCreateAnswer() {
  errorMessage.value = ''

  try {
    const envelope = await createAnswerMutation.mutateAsync()
    const createdAnswer = envelope.answer
    if (!createdAnswer) {
      errorMessage.value = '回答を作成できませんでした。'
      return
    }
    await router.push({
      path: `/workspace/forms/${encodeURIComponent(formId.value)}`,
      query: { answer: createdAnswer.id }
    })
    await selectedAnswerQuery.refetch()
  } catch (error) {
    errorMessage.value = extractValidationMessage(error)
  }
}

async function handleUploadFile(questionId: string) {
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
</script>

<template>
  <section class="space-y-6">
    <RouterLink
      class="inline-flex rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
      to="/workspace/forms"
    >
      申請へ戻る
    </RouterLink>

    <div v-if="formQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="formQuery.data.value" class="space-y-6">
      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-5">
          <h2 class="text-2xl font-semibold text-body">{{ formQuery.data.value.name }}</h2>
          <div class="mt-3 space-y-1 text-sm text-muted">
            <p>
              受付期間 : {{ formQuery.data.value.openAt }}〜{{ formQuery.data.value.closeAt }}
              <span v-if="!formQuery.data.value.isOpen" class="font-semibold text-danger"> — 受付期間外です </span>
            </p>
            <p v-if="formQuery.data.value.maxAnswers > 1">
              1企画あたり {{ formQuery.data.value.maxAnswers }} 件まで回答できます。
            </p>
          </div>
        </div>
        <div class="px-6 py-5">
          <p class="whitespace-pre-wrap text-sm leading-7 text-body">
            {{ formQuery.data.value.description }}
          </p>
        </div>
      </section>

      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-base font-semibold text-body">申請企画名</h3>
        </div>
        <div class="px-6 py-5">
          <div class="flex flex-wrap items-center gap-3">
            <input
              class="min-w-0 flex-1 bg-form-control"
              readonly
              type="text"
              :value="sessionStore.currentCircle?.name ?? ''"
            />
            <RouterLink
              :to="circleSelectorLink"
              class="inline-flex rounded border border-border bg-surface px-4 py-2 text-sm font-semibold text-body transition hover:bg-surface-light"
            >
              企画を変更
            </RouterLink>
          </div>
        </div>
      </section>

      <section
        v-if="selectedAnswer?.updatedAt"
        class="rounded border border-border bg-surface px-6 py-5 text-sm text-muted shadow-lv1"
      >
        回答の最終更新日時 : {{ selectedAnswer.updatedAt }}
      </section>

      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-base font-semibold text-body">回答一覧</h3>
        </div>
        <div class="grid gap-4 px-6 py-5">
          <p class="text-sm text-muted">現在 {{ answers.length }} / {{ formQuery.data.value.maxAnswers }} 件</p>
          <div class="flex flex-wrap gap-3">
            <RouterLink
              v-for="answer in answers"
              :key="answer.id"
              :to="{
                path: `/workspace/forms/${formId}`,
                query: { answer: answer.id }
              }"
              class="rounded border px-4 py-2 text-sm transition"
              :class="
                selectedAnswerId === answer.id
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border bg-surface text-body hover:bg-surface-light'
              "
            >
              回答 {{ answer.updatedAt }}
            </RouterLink>
            <button
              class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isDisabled || hasReachedAnswerLimit || createAnswerMutation.isPending.value"
              type="button"
              @click="handleCreateAnswer"
            >
              {{ createAnswerMutation.isPending.value ? '作成中...' : '新しい回答を作成' }}
            </button>
          </div>
          <p v-if="hasReachedAnswerLimit" class="text-sm text-muted">
            このフォームではこれ以上新しい回答を作成できません。
          </p>
        </div>
      </section>

      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-base font-semibold text-body">
            {{ formQuery.data.value.questions.length > 0 ? '回答を入力' : '回答内容' }}
          </h3>
        </div>

        <div class="grid gap-0">
          <template v-if="formQuery.data.value.questions.length === 0">
            <div class="border-b border-border px-6 py-5">
              <label class="grid gap-2 text-sm text-body">
                <span>回答</span>
                <textarea
                  :value="typeof draft['legacy-body'] === 'string' ? draft['legacy-body'] : ''"
                  class="min-h-40"
                  name="answer-body"
                  :disabled="isDisabled"
                  placeholder="回答内容を入力してください"
                  @input="updateDraftValue(draft, 'legacy-body', ($event.target as HTMLTextAreaElement).value)"
                />
              </label>
            </div>
          </template>

          <template v-for="question in formQuery.data.value.questions" :key="question.id">
            <div v-if="question.type === 'heading'" class="border-b border-border px-6 py-5">
              <h4 class="text-lg font-semibold text-body">{{ question.name }}</h4>
              <p v-if="question.description" class="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                {{ question.description }}
              </p>
            </div>

            <div v-else class="border-b border-border px-6 py-5">
              <div class="grid gap-3">
                <div>
                  <p class="text-sm font-semibold text-body">
                    {{ question.name }}
                    <span v-if="question.isRequired" class="ml-2 text-xs font-semibold text-danger"> 必須 </span>
                  </p>
                  <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {{ question.description }}
                  </p>
                </div>

                <AnswerQuestionFields
                  :answer="selectedAnswer"
                  :draft="draft"
                  :question="question"
                  :disabled="isDisabled"
                  :upload-button-label="'ファイルを追加'"
                  :upload-pending="uploadMutation.isPending.value"
                  :upload-error-message="uploadErrorMessages[question.id]"
                  :download-label="selectedAnswerId ? 'ダウンロード' : '表示'"
                  :download-href="
                    (currentQuestion) =>
                      selectedAnswerId
                        ? buildFormAnswerUploadDownloadUrlByAnswer(formId, selectedAnswerId, currentQuestion.id)
                        : buildFormAnswerUploadDownloadUrl(
                            formId,
                            (selectedAnswer?.uploads ?? []).find((upload) => upload.questionId === currentQuestion.id)
                              ?.id ?? ''
                          )
                  "
                  @upload="handleUploadFile"
                  @file-change="handleFileChange"
                />
              </div>
            </div>
          </template>
        </div>
      </section>

      <p v-if="errorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
        {{ errorMessage }}
      </p>

      <div class="flex justify-center">
        <button
          class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isDisabled || isSavingAnswer"
          type="button"
          @click="handleSaveAnswer"
        >
          {{ isSavingAnswer ? '送信中...' : '送信' }}
        </button>
      </div>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
      フォームを取得できませんでした。
    </div>
  </section>
</template>
