<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/:formId/answers/:answerId/edit',
  meta: staffPageMeta('formAnswers.edit')
})

import { computed, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { formatDateTime, formatDateTimeUpdated } from '@/lib/format/datetime'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AnswerFormEditor from '@/features/forms/components/AnswerFormEditor.vue'
import SchemaAnswerFields from '@/components/forms/SchemaAnswerFields.vue'
import { buildFormAnswerUploadDownloadUrlByAnswer, type FormAnswerDraft } from '@/features/forms/answers'
import { useUnsavedChangesGuard } from '@/features/forms/composables/useUnsavedChangesGuard'
import type { AnswerFormSaveResult } from '@/features/forms/answers'
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

const route = useRoute('/staff/forms/[formId]/answers/[answerId]/edit')
const router = useRouter()
const formId = computed(() => String(route.params.formId ?? ''))
const answerId = computed(() => String(route.params.answerId ?? ''))
const { enabled } = useAuthorizedStaffContext()
const answerQuery = useStaffFormAnswerDetailQuery(formId, answerId, enabled)
const updateAnswerMutation = useUpdateStaffFormAnswerMutation(formId, answerId)
const deleteAnswerMutation = useDeleteStaffFormAnswerMutation(formId)
const uploadMutation = useUploadStaffFormAnswerFileMutation(formId, answerId)
const answerDirty = shallowRef(false)
const errorMessage = ref('')
const uploadErrorMessages = ref<Record<string, string>>({})
const selectedFiles = ref<Record<string, File | null>>({})
watch([formId, answerId], () => {
  selectedFiles.value = {}
  uploadErrorMessages.value = {}
  errorMessage.value = ''
})
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'answers'))
const hasUnuploadedFiles = computed(() => Object.values(selectedFiles.value).some((file) => file !== null))
const isDirty = computed(() => answerDirty.value || hasUnuploadedFiles.value)
const { clear: clearUnsavedChangesGuard, confirmBeforeSwitching } = useUnsavedChangesGuard(isDirty)
onBeforeRouteUpdate((to, from) => to.path === from.path || confirmBeforeSwitching())
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

async function handleSaveAnswer(draft: FormAnswerDraft): Promise<AnswerFormSaveResult | null> {
  const detail = answerQuery.data.value
  if (!detail) {
    return null
  }

  errorMessage.value = ''
  const body = typeof draft['legacy-body'] === 'string' ? draft['legacy-body'] : detail.answer.body

  try {
    const answer = await updateAnswerMutation.mutateAsync(staffAnswerDraftToPayload(detail.circle.id, body, draft))
    return { answer }
  } catch (error) {
    errorMessage.value = extractStaffFormAnswerValidationMessage(error)
    return null
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
    clearUnsavedChangesGuard()
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

function handleFileChange(questionId: string, file: File | null) {
  selectedFiles.value = { ...selectedFiles.value, [questionId]: file }
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
          <p class="whitespace-pre-wrap text-base leading-7 text-body">
            {{ answerQuery.data.value.form.description }}
          </p>
        </div>
      </SurfaceCard>

      <section class="rounded border border-border bg-surface px-6 py-5 text-base text-muted shadow-lv1">
        最終更新日時 : {{ formatDateTime(answerQuery.data.value.answer.updatedAt) }}
      </section>

      <section class="rounded border border-border bg-surface-light px-6 py-5 text-base text-muted shadow-lv1">
        {{ notificationMessage }}
      </section>

      <AnswerFormEditor
        :key="`${formId}/${answerId}`"
        v-model:dirty="answerDirty"
        :questions="answerQuery.data.value.form.questions"
        :answer="answerQuery.data.value.answer"
        :disabled="deleteAnswerMutation.isPending.value || !enabled"
        :save-answer="handleSaveAnswer"
        legacy-body
        v-slot="{ schema, form: answerForm }"
      >
        <SurfaceCard>
          <SurfaceHeader>
            <template #title>回答を編集</template>
          </SurfaceHeader>

          <SchemaAnswerFields
            :schema="schema"
            :form="answerForm"
            :answer="answerQuery.data.value.answer"
            :disabled="deleteAnswerMutation.isPending.value"
            :selected-files="selectedFiles"
            upload-button-label="添付を更新"
            :upload-pending="uploadMutation.isPending.value"
            :upload-error-messages="uploadErrorMessages"
            download-label="ダウンロード"
            :download-href="(questionId) => buildFormAnswerUploadDownloadUrlByAnswer(formId, answerId, questionId)"
            @upload="handleUploadFile"
            @file-change="handleFileChange"
          />

          <div class="flex flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5">
            <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
            <div class="ml-auto flex flex-wrap gap-3">
              <BaseButton
                variant="dangerOutline"
                size="lg"
                weight="semibold"
                :disabled="deleteAnswerMutation.isPending.value || answerForm.isSubmitting"
                type="button"
                @click="handleDeleteAnswer"
              >
                削除
              </BaseButton>
              <BaseButton
                variant="primary"
                size="lg"
                weight="bold"
                :disabled="deleteAnswerMutation.isPending.value || answerForm.isSubmitting"
                type="submit"
              >
                {{ answerForm.isSubmitting ? '保存中...' : '変更を保存' }}
              </BaseButton>
            </div>
          </div>
        </SurfaceCard>
      </AnswerFormEditor>

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
              class="flex items-center justify-between gap-4 text-base text-body"
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
