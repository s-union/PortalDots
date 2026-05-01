<script setup lang="ts">
definePage({
  path: '/staff/circles/participation_types/:typeId/edit',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.participationTypes'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  buildDeleteStaffParticipationTypeConfirmMessage,
  extractStaffParticipationTypeValidationMessage,
  useDeleteStaffParticipationTypeMutation,
  useStaffParticipationTypeDetailQuery,
  useUpdateStaffParticipationTypeMutation
} from '@/features/staff/participation-types/api'
import { buildStaffParticipationTypeTabs } from '@/features/ui/tabStrip'
import { useFormValidation, staffParticipationTypeEditFormSchema } from '@/lib/form-validation'

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

    <div v-if="detailQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <form v-else-if="detailQuery.data.value" class="space-y-6" @submit.prevent="handleSave">
      <SurfaceCard tag="header">
        <h2 class="text-3xl font-semibold text-body">{{ detailQuery.data.value.name }}</h2>
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            class="rounded border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger-light disabled:opacity-60"
            :disabled="deleteMutation.isPending.value"
            type="button"
            @click="handleDelete"
          >
            {{ deleteMutation.isPending.value ? '削除中...' : '参加種別を削除' }}
          </button>
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
            <div class="grid gap-2 text-sm text-body">
              <span class="sr-only">参加種別名</span>
              <input
                v-model="form.name"
                name="name"
                type="text"
                :class="{ 'border-danger': getFieldError('name') }"
                @blur="markTouched('name')"
                @input="markTouched('name')"
              />
              <p v-if="getFieldError('name')" class="text-xs text-danger">{{ getFieldError('name') }}</p>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-body">説明</p>
              <p class="text-xs text-muted-2">参加登録画面の案内として一般ユーザーに表示します。</p>
            </div>
            <label class="grid gap-2 text-sm text-body">
              <span class="sr-only">説明</span>
              <textarea v-model="form.description" class="min-h-24" name="description" />
            </label>
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
              <div class="grid gap-2 text-sm text-body">
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
                <p v-if="getFieldError('usersCountMin')" class="text-xs text-danger">
                  {{ getFieldError('usersCountMin') }}
                </p>
              </div>
              <div class="grid gap-2 text-sm text-body">
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
                <p v-if="getFieldError('usersCountMax')" class="text-xs text-danger">
                  {{ getFieldError('usersCountMax') }}
                </p>
              </div>
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
              <label class="grid gap-2 text-sm text-body">
                <span class="sr-only">付与タグ</span>
                <StaffTagPicker v-model="form.tags" :available-tags="availableTags" name="tags" />
              </label>
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
            <div class="flex justify-end">
              <button
                :class="cn(buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' }))"
                :disabled="updateMutation.isPending.value"
                type="submit"
              >
                {{ updateMutation.isPending.value ? '保存中...' : '保存' }}
              </button>
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
