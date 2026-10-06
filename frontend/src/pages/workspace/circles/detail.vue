<script setup lang="ts">
definePage({
  path: '/workspace/circles/detail',
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AnswerFormEditor from '@/features/forms/components/AnswerFormEditor.vue'
import SchemaAnswerFields from '@/components/forms/SchemaAnswerFields.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import CircleRegistrationSteps from '@/features/circles/components/CircleRegistrationSteps.vue'
import {
  useCurrentCircleDetailQuery,
  useDeleteCircleMutation,
  useUpdateCircleMutation
} from '@/features/circles/queries'
import {
  buildFormAnswerUploadDownloadUrl,
  extractValidationMessage as extractAnswerValidationMessage,
  useFormAnswerUploadMutation
} from '@/features/forms/answers'
import type { FormAnswerDraft } from '@/features/forms/answers'
import type { AnswerFormSaveResult } from '@/features/forms/composables/useAnswerForm'
import type { CircleDetail } from '@/features/circles/api'
import { useUnsavedChangesGuard } from '@/features/forms/composables/useUnsavedChangesGuard'
import { extractValidationMessage } from '@/lib/api/validation'
import { buttonVariants } from '@/lib/ui/variants'
import { useFormValidation, circleRegistrationFormSchema } from '@/lib/form-validation'
import FormField from '@/components/ui/FormField.vue'

const router = useRouter()
const detailQuery = useCurrentCircleDetailQuery()
const updateMutation = useUpdateCircleMutation()
const deleteMutation = useDeleteCircleMutation()

const form = reactive({
  name: '',
  nameYomi: '',
  groupName: '',
  groupNameYomi: '',
  participationTypeId: '',
  notes: ''
})

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: circleRegistrationFormSchema,
  form: computed(() => form)
})

const questions = computed(() => detailQuery.data.value?.questions ?? [])
const answerDirty = ref(false)
const uploadMutation = useFormAnswerUploadMutation(computed(() => detailQuery.data.value?.formId ?? ''))
const formDescription = computed(() => detailQuery.data.value?.formDescription.trim() ?? '')
const requiresMemberStep = computed(() => {
  const detail = detailQuery.data.value
  if (!detail) {
    return false
  }
  return detail.usersCountMax > 1
})
const totalSteps = computed(() => (requiresMemberStep.value ? 3 : 2))
const canEdit = computed(() => {
  const detail = detailQuery.data.value
  return detail?.isLeader === true && detail.submittedAt === null
})
const nextStepPath = computed(() =>
  requiresMemberStep.value ? '/workspace/circles/members' : '/workspace/circles/confirm'
)

const successMessage = ref('')
const errorMessage = ref('')
const uploadErrorMessages = ref<Record<string, string>>({})
const selectedFiles = ref<Record<string, File | null>>({})
const hasUnuploadedFiles = computed(() => Object.values(selectedFiles.value).some((file) => file !== null))

const formBaseline = ref({ ...form })
const basicFields = ['name', 'nameYomi', 'groupName', 'groupNameYomi', 'participationTypeId', 'notes'] as const
let baselineCircleId = ''

const isDirty = computed(() => {
  const detail = detailQuery.data.value
  if (!detail) {
    return false
  }
  const basicInfoChanged =
    form.name !== formBaseline.value.name ||
    form.nameYomi !== formBaseline.value.nameYomi ||
    form.groupName !== formBaseline.value.groupName ||
    form.groupNameYomi !== formBaseline.value.groupNameYomi ||
    form.participationTypeId !== formBaseline.value.participationTypeId ||
    form.notes !== formBaseline.value.notes
  return basicInfoChanged || answerDirty.value || hasUnuploadedFiles.value
})
const { clear: clearUnsavedChangesGuard } = useUnsavedChangesGuard(isDirty)

function syncBasicInfo(detail: CircleDetail, submitted?: typeof form) {
  const changedCircle = detail.id !== baselineCircleId
  for (const key of basicFields) {
    const previous = submitted?.[key] ?? formBaseline.value[key]
    if (changedCircle || form[key] === previous) form[key] = detail[key]
    formBaseline.value[key] = detail[key]
  }
  baselineCircleId = detail.id
}

watch(
  () => detailQuery.data.value,
  (detail) => {
    if (detail) syncBasicInfo(detail)
  },
  { immediate: true }
)

let continueAfterSave = false
function beforeSave(event: SubmitEvent) {
  continueAfterSave = event.submitter?.getAttribute('value') === 'continue'
  return validateAll()
}

async function saveCircle(draft: FormAnswerDraft): Promise<AnswerFormSaveResult | null> {
  const detail = detailQuery.data.value
  if (!detail || !canEdit.value) return null
  const submitted = { ...form }
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const saved = await updateMutation.mutateAsync({
      name: submitted.name,
      nameYomi: submitted.nameYomi,
      groupName: submitted.groupName,
      groupNameYomi: submitted.groupNameYomi,
      notes: submitted.notes,
      details: draft
    })
    if (detailQuery.data.value?.id !== detail.id) return null
    syncBasicInfo(saved, submitted)
    successMessage.value = '企画参加登録の内容を保存しました。'
    return { answer: saved.answer }
  } catch (error) {
    errorMessage.value = extractValidationMessage(error, '企画情報の更新に失敗しました。')
    return null
  }
}

async function handleSaved() {
  if (continueAfterSave && !isDirty.value) await router.push(nextStepPath.value)
}

async function handleDelete() {
  if (!confirm('企画を削除します。この操作は取り消せません。よろしいですか？')) {
    return
  }
  errorMessage.value = ''

  try {
    await deleteMutation.mutateAsync()
    clearUnsavedChangesGuard()
    await router.push('/')
  } catch {
    errorMessage.value = '企画の削除に失敗しました。リーダーのみ削除できます。'
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
      file
    })
    selectedFiles.value = { ...selectedFiles.value, [questionId]: null }
    await detailQuery.refetch()
  } catch (error) {
    uploadErrorMessages.value = {
      ...uploadErrorMessages.value,
      [questionId]: extractAnswerValidationMessage(error)
    }
  }
}

function handleFileChange(questionId: string, file: File | null) {
  selectedFiles.value = { ...selectedFiles.value, [questionId]: file }
}

function downloadHref(questionId: string) {
  const detail = detailQuery.data.value
  const upload = detail?.answer?.uploads.find((item) => item.questionId === questionId)
  if (!detail?.formId || !upload) {
    return ''
  }
  return buildFormAnswerUploadDownloadUrl(detail.formId, upload.id)
}
</script>

<template>
  <PageLayout spacious>
    <SurfaceCard tag="header">
      <SurfaceCardBand borderless>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">
              {{ detailQuery.data.value?.participationTypeName ?? '企画' }} 参加登録
              <small class="ml-2 text-sm font-normal text-muted"> (ステップ 1 / {{ totalSteps }}) </small>
            </h1>
            <p v-if="detailQuery.data.value" class="text-base text-muted">
              {{ detailQuery.data.value.name }}
              <span class="mx-1">/</span>
              {{ detailQuery.data.value.submittedAt ? '提出済み' : '未提出' }}
            </p>
          </div>
        </div>
        <CircleRegistrationSteps :current-step="1" :requires-member-step="requiresMemberStep" />
      </SurfaceCardBand>
    </SurfaceCard>

    <div v-if="detailQuery.isPending.value" class="text-base text-muted">読み込み中...</div>

    <AnswerFormEditor
      v-else-if="detailQuery.data.value"
      :key="`${detailQuery.data.value.id}/${detailQuery.data.value.formId}`"
      v-model:dirty="answerDirty"
      :questions="questions"
      :answer="detailQuery.data.value.answer"
      :disabled="!canEdit || deleteMutation.isPending.value"
      :before-submit="beforeSave"
      :save-answer="saveCircle"
      class="space-y-6"
      @saved="handleSaved"
      v-slot="{ schema, form: answerForm }"
    >
      <AlertMessage v-if="detailQuery.data.value.submittedAt === null" tone="info">
        <strong>企画情報の修正や、企画参加登録を提出することができるのは、企画責任者のみです。</strong>
      </AlertMessage>

      <AlertMessage v-if="!detailQuery.data.value.isLeader" tone="danger">
        この企画の編集と提出は責任者のみが行えます。
      </AlertMessage>

      <AlertMessage
        v-if="detailQuery.data.value.status === 'rejected' && detailQuery.data.value.statusReason"
        tone="danger"
      >
        {{ `【不受理理由】 ${detailQuery.data.value.statusReason}` }}
      </AlertMessage>

      <SettingsSection v-if="formDescription" title="必ずお読みください">
        <div class="px-6 py-6 whitespace-pre-wrap text-base leading-7 text-body">
          {{ formDescription }}
        </div>
      </SettingsSection>

      <SettingsSection title="企画情報">
        <SettingsRow>
          <div class="grid gap-4">
            <FormField label="企画責任者" label-class="font-semibold">
              <input :value="detailQuery.data.value.leaderDisplayName" disabled name="leaderDisplayName" type="text" />
            </FormField>

            <FormField label="企画名" label-class="font-semibold" :error="canEdit && getFieldError('name')" required>
              <input
                v-model="form.name"
                :disabled="!canEdit"
                name="name"
                type="text"
                :class="{ 'border-danger': getFieldError('name') && canEdit }"
                @blur="markTouched('name')"
                @input="markTouched('name')"
              />
            </FormField>

            <FormField
              label="企画名（よみ）"
              label-class="font-semibold"
              :error="canEdit && getFieldError('nameYomi')"
              required
            >
              <input
                v-model="form.nameYomi"
                :disabled="!canEdit"
                name="nameYomi"
                required
                type="text"
                placeholder="ひらがなで入力"
                :class="{ 'border-danger': getFieldError('nameYomi') && canEdit }"
                @blur="markTouched('nameYomi')"
                @input="markTouched('nameYomi')"
              />
            </FormField>

            <FormField
              label="企画を出店する団体の名称"
              label-class="font-semibold"
              :error="canEdit && detailQuery.data.value.canChangeGroupName && getFieldError('groupName')"
              required
            >
              <input
                v-model="form.groupName"
                :disabled="!canEdit || !detailQuery.data.value.canChangeGroupName"
                name="groupName"
                type="text"
                placeholder="例: ○○サークル"
                :class="{
                  'border-danger': getFieldError('groupName') && canEdit && detailQuery.data.value.canChangeGroupName
                }"
                @blur="markTouched('groupName')"
                @input="markTouched('groupName')"
              />
            </FormField>

            <FormField
              label="企画を出店する団体の名称（よみ）"
              label-class="font-semibold"
              :error="canEdit && detailQuery.data.value.canChangeGroupName && getFieldError('groupNameYomi')"
              required
            >
              <input
                v-model="form.groupNameYomi"
                :disabled="!canEdit || !detailQuery.data.value.canChangeGroupName"
                name="groupNameYomi"
                required
                type="text"
                placeholder="ひらがなで入力"
                :class="{
                  'border-danger':
                    getFieldError('groupNameYomi') && canEdit && detailQuery.data.value.canChangeGroupName
                }"
                @blur="markTouched('groupNameYomi')"
                @input="markTouched('groupNameYomi')"
              />
            </FormField>

            <p v-if="!detailQuery.data.value.canChangeGroupName" class="text-base text-muted">
              団体名は既存企画から引き継がれているため、この画面では変更できません。
            </p>

            <FormField label="備考" label-class="font-semibold">
              <textarea v-model="form.notes" :disabled="!canEdit" name="notes" rows="3" />
            </FormField>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="参加登録フォーム">
        <div v-if="questions.length === 0" class="px-6 py-5 text-base text-muted">追加の設問はありません。</div>

        <SchemaAnswerFields
          :schema="schema"
          :form="answerForm"
          :answer="detailQuery.data.value.answer"
          :disabled="!canEdit"
          :selected-files="selectedFiles"
          :upload-pending="uploadMutation.isPending.value"
          :upload-error-messages="uploadErrorMessages"
          :download-href="downloadHref"
          @upload="handleUploadFile"
          @file-change="handleFileChange"
        />

        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">
              {{ successMessage }}
            </AlertMessage>
            <AlertMessage v-if="errorMessage" tone="danger">
              {{ errorMessage }}
            </AlertMessage>

            <div class="flex flex-wrap justify-between gap-3">
              <button
                v-if="canEdit"
                :class="buttonVariants({ variant: 'danger', size: 'lg', weight: 'bold' })"
                :disabled="deleteMutation.isPending.value || answerForm.isSubmitting"
                type="button"
                @click="handleDelete"
              >
                企画を削除
              </button>

              <div class="flex flex-wrap gap-3">
                <RouterLink
                  class="inline-flex rounded border border-border bg-surface px-4 py-3 text-base font-semibold text-body transition hover:bg-surface-light hover:no-underline"
                  to="/workspace/circles/members"
                >
                  メンバーを招待
                </RouterLink>
                <button
                  v-if="canEdit"
                  class="rounded border border-border bg-surface px-4 py-3 text-base font-semibold text-body transition hover:bg-surface-light"
                  :disabled="answerForm.isSubmitting || deleteMutation.isPending.value"
                  type="submit"
                  name="action"
                  value="save"
                >
                  {{ answerForm.isSubmitting ? '保存中...' : '保存する' }}
                </button>
                <button
                  v-if="canEdit"
                  :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' })"
                  :disabled="answerForm.isSubmitting || deleteMutation.isPending.value"
                  type="submit"
                  name="action"
                  value="continue"
                >
                  {{ requiresMemberStep ? '保存して次へ' : '確認画面へ' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </SettingsSection>
    </AnswerFormEditor>

    <div v-else class="rounded border border-border px-6 py-6 text-base text-muted">
      企画情報を取得できませんでした。
    </div>
  </PageLayout>
</template>
