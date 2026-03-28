<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AnswerQuestionFields from '@/components/forms/AnswerQuestionFields.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useCurrentCircleDetailQuery, useDeleteCircleMutation, useUpdateCircleMutation } from '@/features/circles/api'
import {
  buildFormAnswerUploadDownloadUrl,
  extractValidationMessage as extractAnswerValidationMessage,
  useFormAnswerEditorDraft,
  useFormAnswerUploadMutation
} from '@/features/forms/answers'
import { extractValidationMessage } from '@/lib/api/validation'
import { formatDate } from '@/lib/format/datetime'
import { buttonVariants } from '@/lib/ui/variants'

const router = useRouter()
const detailQuery = useCurrentCircleDetailQuery()
const updateMutation = useUpdateCircleMutation()
const deleteMutation = useDeleteCircleMutation()

const form = reactive({
  name: '',
  nameYomi: '',
  groupName: '',
  groupNameYomi: '',
  notes: ''
})

const questions = computed(() => detailQuery.data.value?.questions ?? [])
const draft = useFormAnswerEditorDraft(
  computed(() => detailQuery.data.value?.answer ?? null),
  questions
)
const uploadMutation = useFormAnswerUploadMutation(computed(() => detailQuery.data.value?.formId ?? ''))
const requiresMemberStep = computed(() => {
  const detail = detailQuery.data.value
  if (!detail) {
    return false
  }
  return detail.usersCountMin > 1 || detail.usersCountMax > 1
})
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

watch(
  () => detailQuery.data.value,
  (detail) => {
    if (!detail) {
      return
    }
    form.name = detail.name
    form.nameYomi = detail.nameYomi
    form.groupName = detail.groupName
    form.groupNameYomi = detail.groupNameYomi
    form.notes = detail.notes
  },
  { immediate: true }
)

async function saveCircle() {
  const detail = detailQuery.data.value
  if (!detail) {
    return false
  }

  successMessage.value = ''
  errorMessage.value = ''

  try {
    await updateMutation.mutateAsync({
      name: form.name,
      nameYomi: form.nameYomi,
      groupName: form.groupName,
      groupNameYomi: form.groupNameYomi,
      notes: form.notes,
      details: draft.value
    })
    await detailQuery.refetch()
    successMessage.value = '企画参加登録の内容を保存しました。'
    return true
  } catch (error) {
    errorMessage.value = extractValidationMessage(error, '企画情報の更新に失敗しました。')
    return false
  }
}

async function handleSave() {
  await saveCircle()
}

async function handleSaveAndContinue() {
  const saved = await saveCircle()
  if (!saved) {
    return
  }
  await router.push(nextStepPath.value)
}

async function handleDelete() {
  if (!confirm('企画を削除します。この操作は取り消せません。よろしいですか？')) {
    return
  }
  errorMessage.value = ''

  try {
    await deleteMutation.mutateAsync()
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
  <PageLayout>
    <BackLink to="/workspace">ワークスペースへ戻る</BackLink>

    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Circle Registration</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">企画参加登録 1/3</h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        企画情報と参加登録フォームの回答を編集します。保存後にメンバー確認または確認画面へ進みます。
      </p>
    </SurfaceCard>

    <div v-if="detailQuery.isPending.value" class="text-sm text-muted">読み込み中...</div>

    <template v-else-if="detailQuery.data.value">
      <div
        class="rounded border px-6 py-4"
        :class="
          detailQuery.data.value.submittedAt ? 'border-success bg-success-light' : 'border-warning bg-warning-light'
        "
      >
        <p class="text-sm font-semibold">
          {{
            detailQuery.data.value.submittedAt
              ? `提出済み (${formatDate(detailQuery.data.value.submittedAt)})`
              : '未提出'
          }}
        </p>
        <p class="mt-1 text-xs text-muted">
          参加種別: {{ detailQuery.data.value.participationTypeName }} / 代表者:
          {{ detailQuery.data.value.leaderDisplayName }}
        </p>
        <p class="mt-1 text-xs text-muted">
          メンバー数: {{ detailQuery.data.value.memberCount }}人 ({{ detailQuery.data.value.usersCountMin }}〜{{
            detailQuery.data.value.usersCountMax
          }}人)
        </p>
      </div>

      <AlertMessage v-if="!detailQuery.data.value.isLeader" tone="danger">
        この企画の編集と提出は責任者のみが行えます。
      </AlertMessage>

      <SettingsSection title="企画基本情報">
        <SettingsRow>
          <div class="grid gap-4">
            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">企画名 <span class="text-danger">*</span></span>
              <input v-model="form.name" :disabled="!canEdit" name="name" type="text" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">企画名（よみ）</span>
              <input v-model="form.nameYomi" :disabled="!canEdit" name="nameYomi" type="text" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">団体名 <span class="text-danger">*</span></span>
              <input
                v-model="form.groupName"
                :disabled="!canEdit || !detailQuery.data.value.canChangeGroupName"
                name="groupName"
                type="text"
              />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">団体名（よみ）</span>
              <input
                v-model="form.groupNameYomi"
                :disabled="!canEdit || !detailQuery.data.value.canChangeGroupName"
                name="groupNameYomi"
                type="text"
              />
            </label>

            <p v-if="!detailQuery.data.value.canChangeGroupName" class="text-sm text-muted">
              団体名は既存企画から引き継がれているため、この画面では変更できません。
            </p>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-semibold">備考</span>
              <textarea v-model="form.notes" :disabled="!canEdit" name="notes" rows="3" />
            </label>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="参加登録フォーム">
        <div v-if="detailQuery.data.value.formDescription" class="border-b border-border px-6 py-5">
          <p class="whitespace-pre-wrap text-sm leading-7 text-body">
            {{ detailQuery.data.value.formDescription }}
          </p>
        </div>

        <div class="grid gap-0">
          <template v-for="question in questions" :key="question.id">
            <div v-if="question.type === 'heading'" class="border-b border-border px-6 py-5">
              <h3 class="text-lg font-semibold text-body">{{ question.name }}</h3>
              <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                {{ question.description }}
              </p>
            </div>

            <div v-else class="border-b border-border px-6 py-5">
              <div class="grid gap-3">
                <div>
                  <p class="text-sm font-semibold text-body">
                    {{ question.name }}
                    <span v-if="question.isRequired" class="ml-2 text-xs font-semibold text-danger">必須</span>
                  </p>
                  <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {{ question.description }}
                  </p>
                </div>

                <AnswerQuestionFields
                  :answer="detailQuery.data.value.answer"
                  :draft="draft"
                  :question="question"
                  :disabled="!canEdit"
                  :upload-button-label="'ファイルを追加'"
                  :upload-pending="uploadMutation.isPending.value"
                  :upload-error-message="uploadErrorMessages[question.id]"
                  :download-href="(currentQuestion) => downloadHref(currentQuestion.id)"
                  @upload="handleUploadFile"
                  @file-change="handleFileChange"
                />
              </div>
            </div>
          </template>
        </div>

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
                :disabled="deleteMutation.isPending.value"
                type="button"
                @click="handleDelete"
              >
                企画を削除
              </button>

              <div class="flex flex-wrap gap-3">
                <RouterLink
                  class="inline-flex rounded border border-border bg-surface px-4 py-3 text-sm font-semibold text-body transition hover:bg-surface-light hover:no-underline"
                  to="/workspace/circles/members"
                >
                  メンバー管理
                </RouterLink>
                <button
                  v-if="canEdit"
                  class="rounded border border-border bg-surface px-4 py-3 text-sm font-semibold text-body transition hover:bg-surface-light"
                  :disabled="updateMutation.isPending.value"
                  type="button"
                  @click="handleSave"
                >
                  {{ updateMutation.isPending.value ? '保存中...' : '保存する' }}
                </button>
                <button
                  v-if="canEdit"
                  :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' })"
                  :disabled="updateMutation.isPending.value"
                  type="button"
                  @click="handleSaveAndContinue"
                >
                  {{ requiresMemberStep ? '保存してメンバー確認へ' : '保存して確認画面へ' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </SettingsSection>
    </template>

    <div v-else class="rounded border border-border px-6 py-6 text-sm text-muted">企画情報を取得できませんでした。</div>
  </PageLayout>
</template>
