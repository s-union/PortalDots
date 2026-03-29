<script setup lang="ts">
definePage({
  path: '/staff/forms/:formId/edit',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'forms.edit'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDateTime, formatDateTimeLocalValue, parseDateTimeLocalValue } from '@/lib/format/datetime'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import {
  buildCopyStaffFormConfirmMessage,
  buildDeleteStaffFormConfirmMessage,
  extractStaffFormValidationMessage,
  useCopyStaffFormMutation,
  useDeleteStaffFormMutation,
  useStaffFormDetailQuery,
  useUpdateStaffFormMutation
} from '@/features/staff/forms/api'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'

const route = useRoute('/staff/forms/[formId]/edit')
const router = useRouter()
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const formQuery = useStaffFormDetailQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const tagsQuery = useStaffTagsQuery(computed(() => staffStatusQuery.data.value?.authorized === true))
const updateFormMutation = useUpdateStaffFormMutation(formId)
const copyFormMutation = useCopyStaffFormMutation()
const deleteFormMutation = useDeleteStaffFormMutation()
const errorMessage = ref('')
const editForm = ref({
  circleId: '',
  name: '',
  description: '',
  openAt: '',
  closeAt: '',
  maxAnswers: 1,
  answerableTags: [] as string[],
  confirmationMessage: '',
  isPublic: true
})

const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'edit'))
const isParticipationForm = computed(() => formQuery.data.value?.isParticipationForm ?? false)
const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))

const openAtInput = computed({
  get: () => formatDateTimeLocalValue(editForm.value.openAt),
  set: (value: string) => {
    editForm.value.openAt = parseDateTimeLocalValue(value, editForm.value.openAt)
  }
})

const closeAtInput = computed({
  get: () => formatDateTimeLocalValue(editForm.value.closeAt),
  set: (value: string) => {
    editForm.value.closeAt = parseDateTimeLocalValue(value, editForm.value.closeAt)
  }
})

watch(
  () => formQuery.data.value,
  (value) => {
    if (!value) {
      return
    }

    editForm.value = {
      circleId: value.circle.id,
      name: value.name,
      description: value.description,
      openAt: value.openAt,
      closeAt: value.closeAt,
      maxAnswers: value.maxAnswers,
      answerableTags: [...value.answerableTags],
      confirmationMessage: value.confirmationMessage,
      isPublic: value.isPublic
    }
  },
  { immediate: true }
)

async function handleSaveForm() {
  errorMessage.value = ''

  try {
    await updateFormMutation.mutateAsync({
      circleId: editForm.value.circleId,
      name: editForm.value.name,
      description: editForm.value.description,
      openAt: editForm.value.openAt,
      closeAt: editForm.value.closeAt,
      maxAnswers: Math.max(1, Number(editForm.value.maxAnswers) || 1),
      answerableTags: editForm.value.answerableTags,
      confirmationMessage: editForm.value.confirmationMessage,
      isPublic: editForm.value.isPublic
    })
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error)
  }
}

async function handleCopyForm() {
  errorMessage.value = ''
  const currentFormName = formQuery.data.value?.name ?? 'このフォーム'
  if (typeof window !== 'undefined' && !window.confirm(buildCopyStaffFormConfirmMessage(currentFormName))) {
    return
  }

  try {
    const copied = await copyFormMutation.mutateAsync(formId.value)
    await router.push(`/staff/forms/${encodeURIComponent(copied.id)}/editor`)
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error)
  }
}

async function handleDeleteForm() {
  errorMessage.value = ''
  const currentFormName = formQuery.data.value?.name ?? 'このフォーム'
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffFormConfirmMessage(currentFormName))) {
    return
  }

  try {
    await deleteFormMutation.mutateAsync(formId.value)
    await router.push('/staff/forms')
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <div v-if="formQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="formQuery.data.value" class="space-y-6">
      <TabStrip :tabs="staffFormTabs" />

      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Form Detail</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">設定</h2>
        <div class="mt-3 text-sm text-muted">フォームID : {{ formQuery.data.value.id }}</div>
        <div class="mt-1 text-sm text-muted">対象企画 : {{ formQuery.data.value.circle.name || '-' }}</div>
        <p v-if="isParticipationForm" class="mt-3 text-sm text-muted">
          このフォームは参加登録フォームです。基本設定は参加種別画面で管理し、ここでは設問編集のみ行えます。
        </p>
      </SurfaceCard>

      <SettingsSection title="フォーム設定">
        <SurfaceHeader>
          <template #title>{{ formQuery.data.value.name }}</template>
          <template #description>
            受付期間 : {{ formatDateTime(formQuery.data.value.openAt) }} 〜
            {{ formatDateTime(formQuery.data.value.closeAt) }}
          </template>
          <template #actions>
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex gap-2 text-xs">
                <span
                  class="rounded-full px-3 py-1"
                  :class="
                    formQuery.data.value.isPublic ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                  "
                >
                  {{ formQuery.data.value.isPublic ? 'public' : 'private' }}
                </span>
                <span
                  class="rounded-full px-3 py-1"
                  :class="formQuery.data.value.isOpen ? 'bg-primary-light text-primary' : 'bg-muted-light text-muted'"
                >
                  {{ formQuery.data.value.isOpen ? 'open' : 'closed' }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <RouterLink
                  :to="`/staff/forms/${formId}/preview`"
                  class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                >
                  プレビュー
                </RouterLink>
                <button
                  v-if="!isParticipationForm"
                  class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
                  type="button"
                  @click="handleCopyForm"
                >
                  複製
                </button>
                <button
                  v-if="!isParticipationForm"
                  class="rounded border border-danger px-3 py-2 text-xs text-danger transition hover:bg-danger-light"
                  type="button"
                  @click="handleDeleteForm"
                >
                  削除
                </button>
              </div>
            </div>
          </template>
        </SurfaceHeader>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">フォーム名</p>
              <p class="text-xs text-muted-2">一覧と回答画面で表示する名称です。旧画面と同じく必須項目です。</p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">フォーム名</span>
              <input
                v-model="editForm.name"
                :disabled="isParticipationForm"
                class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                name="name"
                type="text"
              />
            </label>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">フォームの説明</p>
              <p class="text-xs text-muted-2">フォームの説明を入力します。</p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">説明</span>
              <textarea
                v-model="editForm.description"
                :disabled="isParticipationForm"
                class="min-h-32 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                name="description"
              />
            </label>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">受付期間</p>
              <p class="text-xs text-muted-2">受付開始日時と受付終了日時を指定します。</p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>開始日時</span>
                <input v-model="openAtInput" :disabled="isParticipationForm" name="openAt" type="datetime-local" />
              </label>

              <label class="grid gap-2 text-sm text-body">
                <span>締切日時</span>
                <input v-model="closeAtInput" :disabled="isParticipationForm" name="closeAt" type="datetime-local" />
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">公開設定</p>
              <p class="text-xs text-muted-2">受付期間外では、公開中でもユーザーは回答や編集を行えません。</p>
            </div>
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center gap-3 text-sm text-body">
                <input v-model="editForm.isPublic" :disabled="isParticipationForm" name="isPublic" type="checkbox" />
                公開する
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">回答条件</p>
              <p class="text-xs text-muted-2">回答数上限と回答可能タグを設定します。</p>
            </div>
            <div class="grid gap-4">
              <label class="grid gap-2 text-sm text-body">
                <span>最大回答数</span>
                <input
                  v-model.number="editForm.maxAnswers"
                  :disabled="isParticipationForm"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  min="1"
                  name="maxAnswers"
                  type="number"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>回答可能タグ</span>
                <StaffTagPicker
                  v-model="editForm.answerableTags"
                  :available-tags="availableTags"
                  :disabled="isParticipationForm"
                  name="answerableTags"
                />
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">回答完了メッセージ</p>
              <p class="text-xs text-muted-2">提出後に表示する補足文言です。未設定なら既定メッセージを使います。</p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">回答完了メッセージ</span>
              <textarea
                v-model="editForm.confirmationMessage"
                :disabled="isParticipationForm"
                class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                name="confirmationMessage"
              />
            </label>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <p
              v-if="isParticipationForm"
              class="rounded border border-border bg-surface-light px-4 py-3 text-sm text-muted"
            >
              参加登録フォームの公開設定・受付期間・人数条件は参加種別画面から変更してください。
            </p>
            <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
            <div class="flex justify-end">
              <button
                class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isParticipationForm || updateFormMutation.isPending.value"
                type="button"
                @click="handleSaveForm"
              >
                {{
                  isParticipationForm
                    ? '参加種別画面で編集'
                    : updateFormMutation.isPending.value
                      ? '保存中...'
                      : '変更を保存'
                }}
              </button>
            </div>
          </div>
        </template>
      </SettingsSection>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      フォームを取得できませんでした。
    </div>
  </PageLayout>
</template>
