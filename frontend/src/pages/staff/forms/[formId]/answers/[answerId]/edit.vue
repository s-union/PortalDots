<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/:formId/answers/:answerId/edit',
  meta: staffPageMeta('formAnswers.edit')
})

import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDateTime, formatDateTimeUpdated } from '@/lib/format/datetime'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
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
import { buildStaffFormTabs } from '@/lib/ui/tabStrip'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormField from '@/components/ui/FormField.vue'
import { textareaValue } from '@/lib/dom'

const route = useRoute('/staff/forms/[formId]/answers/[answerId]/edit')
const router = useRouter()
const formId = computed(() => String(route.params.formId ?? ''))
const answerId = computed(() => String(route.params.answerId ?? ''))
const { enabled } = useAuthorizedStaffContext()
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
const notificationMessage = computed(() => {
  const form = answerQuery.data.value?.form
  if (!form) {
    return ''
  }
  if (form.isPublic && !form.isParticipationForm) {
    return 'この回答を保存すると、対象企画のメンバーへ回答更新通知メールが送信されます。'
  }
  return 'このフォームでは、スタッフが回答を保存しても企画メンバーへの通知メールは送信されません。'
})

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
  <TabbedSettingsPage :tabs="staffFormTabs">
    <LoadingState v-if="answerQuery.isPending.value" />

    <article v-else-if="answerQuery.data.value" class="space-y-6">
      <SurfaceCard>
        <SurfaceHeader>
          <template #title>{{ answerQuery.data.value.form.name }}</template>
          <template #description>
            企画 : {{ answerQuery.data.value.circle.name }}<br />
            受付期間 : {{ formatDateTime(answerQuery.data.value.form.openAt) }}〜{{
              formatDateTime(answerQuery.data.value.form.closeAt)
            }}<br />
            作成日時 : {{ formatDateTime(answerQuery.data.value.answer.createdAt) }}
          </template>
        </SurfaceHeader>
        <div class="px-6 py-5">
          <p class="whitespace-pre-wrap text-sm leading-7 text-body">
            {{ answerQuery.data.value.form.description }}
          </p>
        </div>
      </SurfaceCard>

      <section class="rounded border border-border bg-surface px-6 py-5 text-sm text-muted shadow-lv1">
        最終更新日時 : {{ formatDateTime(answerQuery.data.value.answer.updatedAt) }}
      </section>

      <section class="rounded border border-border bg-surface-light px-6 py-5 text-sm text-muted shadow-lv1">
        {{ notificationMessage }}
      </section>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>回答を編集</template>
        </SurfaceHeader>

        <div class="grid gap-0">
          <template v-if="answerQuery.data.value.form.questions.length === 0">
            <div class="border-b border-border px-6 py-5">
              <FormField label="回答">
                <textarea
                  :value="typeof draft['legacy-body'] === 'string' ? draft['legacy-body'] : ''"
                  class="min-h-40"
                  name="answer-body"
                  @input="updateDraftValue(draft, 'legacy-body', textareaValue($event))"
                />
              </FormField>
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
          <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
          <div class="ml-auto flex flex-wrap gap-3">
            <BaseButton
              variant="dangerOutline"
              size="lg"
              weight="semibold"
              :disabled="deleteAnswerMutation.isPending.value"
              type="button"
              @click="handleDeleteAnswer"
            >
              削除
            </BaseButton>
            <BaseButton
              variant="primary"
              size="lg"
              weight="bold"
              :disabled="updateAnswerMutation.isPending.value"
              type="button"
              @click="handleSaveAnswer"
            >
              {{ updateAnswerMutation.isPending.value ? '保存中...' : '変更を保存' }}
            </BaseButton>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>同一企画の回答</template>
        </SurfaceHeader>
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
              <span>作成 {{ formatDateTime(sibling.createdAt) }} / {{ formatDateTimeUpdated(sibling.updatedAt) }}</span>
              <span class="text-xs text-muted-2">{{ sibling.uploadCount }} files</span>
            </RouterLink>
          </li>
        </ul>
      </SurfaceCard>
    </article>

    <ErrorState v-else message="回答を取得できませんでした。" />
  </TabbedSettingsPage>
</template>
