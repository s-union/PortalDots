<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/:formId/edit',
  meta: staffPageMeta('forms.edit')
})

import { computed, ref } from 'vue'
import { useServerSyncedForm } from '@/features/forms/composables/useServerSyncedForm'
import { useRoute, useRouter } from 'vue-router'
import { formatDateTime } from '@/lib/format/datetime'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import { SchemaFormFields, type FieldOverrides, type LayoutItem } from '@/features/forms/schema-form'
import { buildCopyStaffFormConfirmMessage, buildDeleteStaffFormConfirmMessage } from '@/features/staff/forms/messages'
import {
  extractStaffFormValidationMessage,
  useCopyStaffFormMutation,
  useDeleteStaffFormMutation,
  useStaffFormDetailQuery,
  useUpdateStaffFormMutation
} from '@/features/staff/forms/queries'
import { useStaffTagsQuery, staffTagColorMap } from '@/features/staff/masters/tags'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { buildStaffFormTabs } from '@/lib/ui/tabStrip'
import { staffFormSchema } from '@/lib/form-validation'
import { staffFormSettingsInput } from '@/features/staff/forms/utils'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'

// Keep the existing captioned rows and control labels independently of the create-page layout.
const settingsLayout: readonly LayoutItem[] = [
  {
    row: ['name'],
    stacked: true,
    compact: true,
    label: 'フォーム名',
    caption: '一覧と回答画面で表示する名称です。必須項目です。'
  },
  {
    row: ['description'],
    stacked: true,
    compact: true,
    label: 'フォームの説明',
    caption: 'フォームの説明を入力します。'
  },
  { row: ['openAt', 'closeAt'], label: '受付期間', caption: '受付開始日時と受付終了日時を指定します。' },
  {
    row: ['isPublic'],
    stacked: true,
    label: '公開設定',
    caption: '受付期間外では、公開中でもユーザーは回答や編集を行えません。'
  },
  {
    row: ['maxAnswers', 'answerableTags'],
    stacked: true,
    label: '回答条件',
    caption: '回答数上限と回答可能タグを設定します。'
  },
  {
    row: ['staffNotificationUserIds'],
    stacked: true,
    label: 'スタッフ用控えの送信先',
    caption:
      '回答があったときに「スタッフ用控え」のメールを送信するスタッフを選択します。未指定の場合、フォーム作成者が送信先になります。'
  },
  {
    row: ['confirmationMessage'],
    stacked: true,
    label: '回答完了メッセージ',
    caption: '提出後に表示する補足文言です。未設定なら既定メッセージを使います。'
  }
]

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
const actionError = ref('')
const staffFormTabs = computed(() => (formId.value.length > 0 ? buildStaffFormTabs(formId.value, 'edit') : []))
const isParticipationForm = computed(() => formQuery.data.value?.isParticipationForm ?? false)
// answerableTags' picker data comes from a query; staffNotificationUserIds is hidden entirely for
// participation forms (whose recipients are managed on the participation type screen instead).
const overrides = computed<FieldOverrides<typeof staffFormSchema.entries>>(() => ({
  name: {
    inputClass:
      'rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary'
  },
  maxAnswers: {
    label: '最大回答数',
    helper: '',
    inputClass:
      'rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary'
  },
  description: { label: '説明' },
  openAt: { label: '開始日時', helper: '' },
  closeAt: { label: '締切日時', helper: '' },
  isPublic: { hideLabel: true, helper: '' },
  answerableTags: {
    label: '回答可能タグ',
    helper: '',
    availableTags: (tagsQuery.data.value ?? []).map((tag) => tag.name),
    tagColors: staffTagColorMap(tagsQuery.data.value ?? [])
  },
  staffNotificationUserIds: { hidden: isParticipationForm.value, helper: '' },
  confirmationMessage: { helper: '' }
}))

const { form, submitEvent: handleSaveForm } = useServerSyncedForm({
  schema: staffFormSchema,
  input: () => staffFormSettingsInput(formQuery.data.value),
  source: () => formQuery.data.value,
  sourceKey: formId,
  disabled: () =>
    isParticipationForm.value ||
    !formQuery.data.value ||
    deleteFormMutation.isPending.value ||
    copyFormMutation.isPending.value,
  errorMessage: extractStaffFormValidationMessage,
  saveInput: async (input) => {
    const current = formQuery.data.value
    if (!current) return null
    const saved = await updateFormMutation.mutateAsync({ ...input, circleId: current.circle.id })
    return { input: staffFormSettingsInput(saved), sourceKey: saved.id }
  }
})
const errorMessage = computed(() => actionError.value || form.errors?.[0] || '')

async function handleCopyForm() {
  actionError.value = ''
  const currentFormName = formQuery.data.value?.name ?? 'このフォーム'
  if (typeof window !== 'undefined' && !window.confirm(buildCopyStaffFormConfirmMessage(currentFormName))) {
    return
  }

  try {
    const copied = await copyFormMutation.mutateAsync(formId.value)
    await router.push(`/staff/forms/${encodeURIComponent(copied.id)}/editor`)
  } catch (error) {
    actionError.value = extractStaffFormValidationMessage(error)
  }
}

async function handleDeleteForm() {
  actionError.value = ''
  const currentFormName = formQuery.data.value?.name ?? 'このフォーム'
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffFormConfirmMessage(currentFormName))) {
    return
  }

  try {
    await deleteFormMutation.mutateAsync(formId.value)
    await router.push('/staff/forms')
  } catch (error) {
    actionError.value = extractStaffFormValidationMessage(error)
  }
}
</script>

<template>
  <TabbedSettingsPage :tabs="staffFormTabs">
    <LoadingState v-if="formQuery.isPending.value" />

    <form
      v-else-if="formQuery.data.value"
      novalidate
      :aria-busy="form.isSubmitting"
      class="space-y-6"
      @submit="handleSaveForm"
    >
      <div class="space-y-1 px-1">
        <h2 class="text-3xl font-semibold text-body">設定</h2>
        <p v-if="isParticipationForm" class="mt-3 text-base text-muted">
          このフォームは参加登録フォームです。基本設定は参加種別画面で管理し、ここでは設問編集のみ行えます。
        </p>
      </div>

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
                <BaseButton
                  v-if="!isParticipationForm"
                  variant="dangerOutline"
                  size="xs"
                  type="button"
                  @click="handleDeleteForm"
                >
                  削除
                </BaseButton>
              </div>
            </div>
          </template>
        </SurfaceHeader>

        <SchemaFormFields
          required-label=""
          :of="form"
          :schema="staffFormSchema"
          variant="settings"
          :disabled="isParticipationForm"
          :overrides="overrides"
          :layout="settingsLayout"
        />

        <template #footer>
          <div class="space-y-4">
            <p
              v-if="isParticipationForm"
              class="rounded border border-border bg-surface-light px-4 py-3 text-base text-muted"
            >
              参加登録フォームの公開設定・受付期間・人数条件は参加種別画面から変更してください。
            </p>
            <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
            <ActionsFooter align="end">
              <BaseButton
                variant="primary"
                size="lg"
                weight="bold"
                :disabled="isParticipationForm || form.isSubmitting"
                type="submit"
              >
                {{ isParticipationForm ? '参加種別画面で編集' : form.isSubmitting ? '保存中...' : '変更を保存' }}
              </BaseButton>
            </ActionsFooter>
          </div>
        </template>
      </SettingsSection>
    </form>

    <ErrorState v-else message="フォームを取得できませんでした。" />
  </TabbedSettingsPage>
</template>
