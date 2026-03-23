<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: 'formAnswers.edit'
  }
})

import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BackLink from '@/components/ui/BackLink.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import AnswerQuestionFields from '@/components/forms/AnswerQuestionFields.vue'
import {
  buildFormAnswerUploadDownloadUrlByAnswer,
  updateDraftValue,
  useFormAnswerEditorDraft
} from '@/features/forms/answers'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  buildDeleteStaffFormAnswerConfirmMessage,
  extractStaffFormAnswerValidationMessage,
  staffAnswerDraftToPayload,
  useDeleteStaffFormAnswerMutation,
  useStaffFormAnswerDetailQuery,
  useUpdateStaffFormAnswerMutation,
  useUploadStaffFormAnswerFileMutation
} from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'

const route = useRoute('/staff/forms/[formId]/answers/[answerId]/edit')
const router = useRouter()
const formId = computed(() => String(route.params.formId ?? ''))
const answerId = computed(() => String(route.params.answerId ?? ''))
const { enabled } = useAuthorizedStaffContext({ requiresCircle: true })
const answerQuery = useStaffFormAnswerDetailQuery(formId, answerId, enabled)
const updateAnswerMutation = useUpdateStaffFormAnswerMutation(formId, answerId)
const deleteAnswerMutation = useDeleteStaffFormAnswerMutation(formId)
const uploadMutation = useUploadStaffFormAnswerFileMutation(formId, answerId)
const draft = useFormAnswerEditorDraft(
  computed(() => answerQuery.data.value?.answer),
  computed(() => answerQuery.data.value?.form.questions ?? [])
)
const errorMessage = ref('')
const uploadErrorMessages = ref<Record<string, string>>({})
const selectedFiles = ref<Record<string, File | null>>({})
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'answers'))

async function handleSaveAnswer() {
  if (!answerQuery.data.value) {
    return
  }

  errorMessage.value = ''
  const body =
    typeof draft.value['legacy-body'] === 'string' ? draft.value['legacy-body'] : answerQuery.data.value.answer.body

  try {
    await updateAnswerMutation.mutateAsync(
      staffAnswerDraftToPayload(answerQuery.data.value.circle.id, body, draft.value)
    )
  } catch (error) {
    errorMessage.value = extractStaffFormAnswerValidationMessage(error)
  }
}

async function handleDeleteAnswer() {
  const groupName = answerQuery.data.value?.circle.groupName
  if (
    groupName &&
    typeof window !== 'undefined' &&
    !window.confirm(buildDeleteStaffFormAnswerConfirmMessage(groupName))
  ) {
    return
  }

  try {
    await deleteAnswerMutation.mutateAsync(answerId.value)
    await router.push(`/staff/forms/${encodeURIComponent(formId.value)}/answers`)
  } catch (error) {
    errorMessage.value = extractStaffFormAnswerValidationMessage(error)
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
    await uploadMutation.mutateAsync({ questionId, file })
    selectedFiles.value = { ...selectedFiles.value, [questionId]: null }
  } catch (error) {
    uploadErrorMessages.value = {
      ...uploadErrorMessages.value,
      [questionId]: extractStaffFormAnswerValidationMessage(error)
    }
  }
}

function handleFileChange(questionId: string, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  selectedFiles.value = {
    ...selectedFiles.value,
    [questionId]: target.files?.[0] ?? target.files?.item(0) ?? null
  }
}
</script>

<template>
  <section class="space-y-6">
    <BackLink :to="`/staff/forms/${formId}/answers`"> 回答一覧へ戻る </BackLink>

    <TabStrip :tabs="staffFormTabs" />

    <div v-if="answerQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="answerQuery.data.value" class="space-y-6">
      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-5">
          <h2 class="text-2xl font-semibold text-body">{{ answerQuery.data.value.form.name }}</h2>
          <div class="mt-3 space-y-1 text-sm text-muted">
            <p>企画 : {{ answerQuery.data.value.circle.name }}</p>
            <p>
              受付期間 :
              {{ answerQuery.data.value.form.openAt }}〜{{ answerQuery.data.value.form.closeAt }}
            </p>
            <p>回答 ID : {{ answerQuery.data.value.answer.id }}</p>
            <p>作成日時 : {{ answerQuery.data.value.answer.createdAt }}</p>
          </div>
        </div>
        <div class="px-6 py-5">
          <p class="whitespace-pre-wrap text-sm leading-7 text-body">
            {{ answerQuery.data.value.form.description }}
          </p>
        </div>
      </section>

      <section class="rounded border border-border bg-surface px-6 py-5 text-sm text-muted shadow-lv1">
        最終更新日時 : {{ answerQuery.data.value.answer.updatedAt }}
      </section>

      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-base font-semibold text-body">回答を編集</h3>
        </div>

        <div class="grid gap-0">
          <template v-if="answerQuery.data.value.form.questions.length === 0">
            <div class="border-b border-border px-6 py-5">
              <label class="grid gap-2 text-sm text-body">
                <span>回答</span>
                <textarea
                  :value="typeof draft['legacy-body'] === 'string' ? draft['legacy-body'] : ''"
                  class="min-h-40"
                  name="answer-body"
                  @input="updateDraftValue(draft, 'legacy-body', ($event.target as HTMLTextAreaElement).value)"
                />
              </label>
            </div>
          </template>

          <template v-for="question in answerQuery.data.value.form.questions" :key="question.id">
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
                  :answer="answerQuery.data.value.answer"
                  :draft="draft"
                  :question="question"
                  :upload-button-label="'添付を更新'"
                  :upload-pending="uploadMutation.isPending.value"
                  :upload-error-message="uploadErrorMessages[question.id]"
                  :download-label="'ダウンロード'"
                  :download-href="
                    (currentQuestion) => buildFormAnswerUploadDownloadUrlByAnswer(formId, answerId, currentQuestion.id)
                  "
                  @upload="handleUploadFile"
                  @file-change="handleFileChange"
                />
              </div>
            </div>
          </template>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5">
          <p v-if="errorMessage" class="text-sm text-danger">{{ errorMessage }}</p>
          <div class="ml-auto flex flex-wrap gap-3">
            <button
              class="rounded border border-danger px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger-light"
              :disabled="deleteAnswerMutation.isPending.value"
              type="button"
              @click="handleDeleteAnswer"
            >
              削除
            </button>
            <button
              class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updateAnswerMutation.isPending.value"
              type="button"
              @click="handleSaveAnswer"
            >
              {{ updateAnswerMutation.isPending.value ? '保存中...' : '変更を保存' }}
            </button>
          </div>
        </div>
      </section>

      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-base font-semibold text-body">同一企画の回答</h3>
        </div>
        <ul class="grid gap-0">
          <li
            v-for="sibling in answerQuery.data.value.siblingAnswers"
            :key="sibling.id"
            class="border-b border-border px-6 py-4 last:border-b-0"
          >
            <RouterLink
              :to="`/staff/forms/${formId}/answers/${sibling.id}/edit`"
              class="flex items-center justify-between gap-4 text-sm text-body"
            >
              <span>作成 {{ sibling.createdAt }} / 更新 {{ sibling.updatedAt }}</span>
              <span class="text-xs text-muted-2">{{ sibling.uploadCount }} files</span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">回答を取得できませんでした。</div>
  </section>
</template>
