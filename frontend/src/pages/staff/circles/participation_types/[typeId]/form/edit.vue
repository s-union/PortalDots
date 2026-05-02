<script setup lang="ts">
definePage({
  path: '/staff/circles/participation_types/:typeId/form/edit',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.participationTypes'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormField from '@/components/ui/FormField.vue'
import FormInput from '@/components/ui/FormInput.vue'
import InfoBox from '@/components/ui/InfoBox.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import { formatDateTimeLocalValue, parseDateTimeLocalValue } from '@/lib/format/datetime'
import {
  extractStaffParticipationTypeValidationMessage,
  useStaffParticipationTypeDetailQuery,
  useUpdateStaffParticipationTypeMutation
} from '@/features/staff/participation-types/api'
import { buildStaffParticipationTypeTabs } from '@/lib/ui/tabStrip'
import CheckboxField from '@/components/ui/CheckboxField.vue'

const route = useRoute('/staff/circles/participation_types/[typeId]/form/edit')
const typeId = computed(() => String(route.params.typeId ?? ''))
const { enabled } = useAuthorizedStaffContext({ capability: 'circles.participationTypes' })
const detailQuery = useStaffParticipationTypeDetailQuery(typeId, enabled)
const updateMutation = useUpdateStaffParticipationTypeMutation(typeId)

const form = ref({
  name: '',
  description: '',
  usersCountMin: 1,
  usersCountMax: 1,
  tags: [] as string[],
  formDescription: '',
  formConfirmationMessage: '',
  openAt: '',
  closeAt: '',
  isPublic: true
})

const errorMessage = ref('')
const successMessage = ref('')

const formEditorRoute = computed(() => {
  const formId = detailQuery.data.value?.form.id
  if (!formId) {
    return `/staff/circles/participation_types/${encodeURIComponent(typeId.value)}/form/edit`
  }
  return `/staff/forms/${encodeURIComponent(formId)}/editor`
})

const participationTypeTabs = computed(() =>
  buildStaffParticipationTypeTabs(typeId.value, 'form', detailQuery.data.value?.form)
)

watch(
  () => detailQuery.data.value,
  (value) => {
    if (!value) {
      return
    }
    form.value = {
      name: value.name,
      description: value.description,
      usersCountMin: value.usersCountMin,
      usersCountMax: value.usersCountMax,
      tags: [...value.tags],
      formDescription: value.form.description,
      formConfirmationMessage: value.form.confirmationMessage,
      openAt: formatDateTimeLocalValue(value.form.openAt),
      closeAt: formatDateTimeLocalValue(value.form.closeAt),
      isPublic: value.form.isPublic
    }
  },
  { immediate: true }
)

async function handleSave() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await updateMutation.mutateAsync({
      ...form.value,
      openAt: parseDateTimeLocalValue(form.value.openAt),
      closeAt: parseDateTimeLocalValue(form.value.closeAt)
    })
    successMessage.value = '参加登録フォーム設定を更新しました。'
  } catch (error) {
    errorMessage.value = extractStaffParticipationTypeValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout fullWidth>
    <TabStrip v-if="detailQuery.data.value" :tabs="participationTypeTabs" />

    <div v-if="detailQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <form v-else-if="detailQuery.data.value" class="space-y-6" @submit.prevent="handleSave">
      <SurfaceCard tag="header">
        <h2 class="text-3xl font-semibold text-body">{{ detailQuery.data.value.name }}</h2>
        <p class="mt-3 text-sm text-muted">参加登録フォームの公開状態と文面を管理します。</p>
      </SurfaceCard>

      <SettingsSection title="参加登録フォームの設定">
        <SurfaceHeader>
          <template #title>企画参加登録のカスタムフォーム</template>
          <template #description>公開設定と表示文面をここで管理します。</template>
          <template #actions>
            <RouterLink
              :to="formEditorRoute"
              class="rounded border border-primary px-3 py-2 text-xs text-primary transition hover:bg-primary-light"
            >
              フォームエディターを開く
            </RouterLink>
          </template>
        </SurfaceHeader>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">公開設定</p>
              <p class="text-xs text-muted-2">この設定がオンで、かつ受付期間内のときに参加登録画面を表示します。</p>
            </div>
            <div class="grid gap-4">
              <InfoBox class="text-muted">
                詳細な設問追加や並び替えは専用エディターで行います。ここでは公開状態と文面を先に整えます。
              </InfoBox>
              <CheckboxField v-model="form.isPublic" label="参加登録画面を公開する" />
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">受付期間</p>
              <p class="text-xs text-muted-2">参加登録画面の表示期間を日時で管理します。</p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <FormField label="受付開始日時">
                <FormInput v-model="form.openAt" name="openAt" type="datetime-local" />
              </FormField>
              <FormField label="受付終了日時">
                <FormInput v-model="form.closeAt" name="closeAt" type="datetime-local" />
              </FormField>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">参加登録前に表示する内容</p>
              <p class="text-xs text-muted-2">
                規約や注意事項などを Markdown で入力できます。参加登録ページ冒頭に表示します。
              </p>
            </div>
            <div class="grid gap-2">
              <FormField label="参加登録前に表示する内容" label-class="sr-only">
                <MarkdownEditorField
                  v-model="form.formDescription"
                  min-height-class="min-h-32"
                  name="formDescription"
                />
              </FormField>
              <p class="text-xs text-muted-2">Markdown 記法をそのまま利用できます。</p>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">提出後メッセージ</p>
              <p class="text-xs text-muted-2">提出完了後の画面と、自動送信メールに表示するメッセージです。</p>
            </div>
            <div class="grid gap-2">
              <FormField label="提出後メッセージ" label-class="sr-only">
                <MarkdownEditorField
                  v-model="form.formConfirmationMessage"
                  min-height-class="min-h-32"
                  name="formConfirmationMessage"
                />
              </FormField>
              <p class="text-xs text-muted-2">こちらも Markdown 記法を利用できます。</p>
            </div>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <InfoBox class="text-muted">
              <p>企画参加登録機能について</p>
              <ul class="mt-2 list-disc space-y-2 pl-5">
                <li>企画名や団体名に加えて独自の入力欄を追加できます。</li>
                <li>提出データはスタッフ向け回答一覧や CSV 出力で確認できます。</li>
                <li>副責任者数の要件を参加種別ごとに切り替えられます。</li>
                <li>提出された参加登録はスタッフ確認フローの起点になります。</li>
              </ul>
            </InfoBox>
            <AlertMessage v-if="successMessage" tone="success">
              {{ successMessage }}
            </AlertMessage>
            <AlertMessage v-if="errorMessage" tone="danger">
              {{ errorMessage }}
            </AlertMessage>
            <div class="flex justify-end">
              <BaseButton
                variant="primary"
                size="wide"
                weight="bold"
                :disabled="updateMutation.isPending.value"
                type="submit"
              >
                {{ updateMutation.isPending.value ? '保存中...' : '保存' }}
              </BaseButton>
            </div>
          </div>
        </template>
      </SettingsSection>
    </form>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      参加種別を取得できませんでした。
    </div>
  </PageLayout>
</template>
