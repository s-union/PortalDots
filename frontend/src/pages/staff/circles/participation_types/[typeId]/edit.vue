<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/circles/participation_types/:typeId/edit',
  meta: staffPageMeta('circles.participationTypes')
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  buildDeleteStaffParticipationTypeConfirmMessage,
  extractStaffParticipationTypeValidationMessage,
  useDeleteStaffParticipationTypeMutation,
  useStaffParticipationTypeDetailQuery,
  useUpdateStaffParticipationTypeMutation
} from '@/features/staff/participation-types/api'
import { buildStaffParticipationTypeTabs } from '@/lib/ui/tabStrip'
import { useFormValidation, staffParticipationTypeEditFormSchema } from '@/lib/form-validation'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import FormError from '@/components/ui/FormError.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormField from '@/components/ui/FormField.vue'

const route = useRoute('/staff/circles/participation_types/[typeId]/edit')
const router = useRouter()
const typeId = computed(() => String(route.params.typeId ?? ''))
const { enabled } = useAuthorizedStaffContext({ capability: 'circles.participationTypes' })
const detailQuery = useStaffParticipationTypeDetailQuery(typeId, enabled)
const tagsQuery = useStaffTagsQuery(enabled)
const updateMutation = useUpdateStaffParticipationTypeMutation(typeId)
const deleteMutation = useDeleteStaffParticipationTypeMutation(typeId)
const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))

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

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: staffParticipationTypeEditFormSchema,
  form
})

const participationTypeTabs = computed(() =>
  buildStaffParticipationTypeTabs(typeId.value, 'edit', detailQuery.data.value?.form)
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
      openAt: value.form.openAt,
      closeAt: value.form.closeAt,
      isPublic: value.form.isPublic
    }
  },
  { immediate: true }
)

async function handleSave() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateAll()) {
    return
  }

  try {
    await updateMutation.mutateAsync({
      ...form.value
    })
    successMessage.value = '参加種別を更新しました。'
  } catch (error) {
    errorMessage.value = extractStaffParticipationTypeValidationMessage(error)
  }
}

async function handleDelete() {
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffParticipationTypeConfirmMessage())) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  try {
    await deleteMutation.mutateAsync()
    await router.push('/staff/circles/participation_types')
  } catch (error) {
    errorMessage.value = extractStaffParticipationTypeValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout fullWidth>
    <TabStrip v-if="detailQuery.data.value" :tabs="participationTypeTabs" />

    <LoadingState v-if="detailQuery.isPending.value" />

    <form v-else-if="detailQuery.data.value" class="space-y-6" @submit.prevent="handleSave">
      <SurfaceCard tag="header" class="px-6 py-5">
        <h2 class="text-3xl font-semibold text-body">参加種別を編集</h2>
        <div class="mt-3 text-sm text-muted">参加種別ID : {{ detailQuery.data.value.id }}</div>
        <div class="mt-4 flex flex-wrap gap-3">
          <BaseButton
            variant="dangerOutline"
            size="sm"
            :disabled="deleteMutation.isPending.value"
            type="button"
            @click="handleDelete"
          >
            {{ deleteMutation.isPending.value ? '削除中...' : 'この参加種別を削除' }}
          </BaseButton>
        </div>
      </SurfaceCard>

      <SettingsSection title="参加種別を編集">
        <SurfaceHeader>
          <template #title>{{ detailQuery.data.value.name }}</template>
          <template #description>
            一般ユーザー向けの表示名と、この参加種別で作成される企画に付与する条件を管理します。
          </template>
        </SurfaceHeader>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">参加種別名</p>
              <p class="text-xs text-muted-2">
                一般ユーザーに表示する名称です。模擬店や展示など、参加区分を分かりやすく入力します。
              </p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span>参加種別名</span>
              <input
                v-model="form.name"
                name="name"
                type="text"
                :class="{ 'border-danger': getFieldError('name') }"
                @blur="markTouched('name')"
                @input="markTouched('name')"
              />
              <FormError v-if="getFieldError('name')" :message="getFieldError('name')" />
            </label>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">説明</p>
              <p class="text-xs text-muted-2">参加登録画面の案内として一般ユーザーに表示します。</p>
            </div>
            <FormField label="説明">
              <textarea v-model="form.description" class="min-h-24" name="description" />
            </FormField>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">必要人数</p>
              <p class="text-xs text-muted-2">
                企画責任者を含む参加登録可能人数の下限と上限です。個人参加のみなら 1 を指定します。
              </p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm text-body">
                <span>最低人数</span>
                <input
                  v-model.number="form.usersCountMin"
                  min="1"
                  name="usersCountMin"
                  type="number"
                  :class="{ 'border-danger': getFieldError('usersCountMin') }"
                  @blur="markTouched('usersCountMin')"
                  @input="markTouched('usersCountMin')"
                />
                <FormError v-if="getFieldError('usersCountMin')" :message="getFieldError('usersCountMin')" />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span>最大人数</span>
                <input
                  v-model.number="form.usersCountMax"
                  min="1"
                  name="usersCountMax"
                  type="number"
                  :class="{ 'border-danger': getFieldError('usersCountMax') }"
                  @blur="markTouched('usersCountMax')"
                  @input="markTouched('usersCountMax')"
                />
                <FormError v-if="getFieldError('usersCountMax')" :message="getFieldError('usersCountMax')" />
              </label>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">付与タグ</p>
              <p class="text-xs text-muted-2">
                この設定を保存した後に作成される企画へ、自動で追加するタグを改行またはカンマ区切りで入力します。
              </p>
            </div>
            <div class="grid gap-3">
              <FormField label="付与タグ">
                <StaffTagPicker v-model="form.tags" :available-tags="availableTags" name="tags" />
              </FormField>
              <p class="text-xs text-muted-2">候補から追加しつつ、必要なら未登録タグもそのまま追加できます。</p>
            </div>
          </div>
        </SettingsRow>

        <template #footer>
          <div class="space-y-4">
            <AlertMessage v-if="successMessage" tone="success">
              {{ successMessage }}
            </AlertMessage>
            <AlertMessage v-if="errorMessage" tone="danger">
              {{ errorMessage }}
            </AlertMessage>
            <ActionsFooter align="end">
              <BaseButton
                variant="primary"
                size="wide"
                weight="bold"
                type="submit"
                :disabled="updateMutation.isPending.value"
              >
                {{ updateMutation.isPending.value ? '保存中...' : '保存' }}
              </BaseButton>
            </ActionsFooter>
          </div>
        </template>
      </SettingsSection>
    </form>

    <ErrorState v-else message="参加種別を取得できませんでした。" />
  </PageLayout>
</template>
