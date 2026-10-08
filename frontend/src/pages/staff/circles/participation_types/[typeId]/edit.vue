<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/circles/participation_types/:typeId/edit',
  meta: staffPageMeta('circles.participationTypes')
})

import { computed, ref } from 'vue'
import { useServerSyncedForm } from '@/features/forms/composables/useServerSyncedForm'
import { useRoute, useRouter } from 'vue-router'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import { useStaffTagsQuery, staffTagColorMap } from '@/features/staff/masters/tags'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  buildDeleteStaffParticipationTypeConfirmMessage,
  extractStaffParticipationTypeValidationMessage,
  useDeleteStaffParticipationTypeMutation,
  useStaffParticipationTypeDetailQuery,
  staffParticipationTypeInput,
  useUpdateStaffParticipationTypeMutation
} from '@/features/staff/participation-types/api'
import { buildStaffParticipationTypeTabs } from '@/lib/ui/tabStrip'
import { staffParticipationTypeEditFormSchema } from '@/lib/form-validation'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormischField from '@/components/forms/FormischField.vue'

const route = useRoute('/staff/circles/participation_types/[typeId]/edit')
const router = useRouter()
const typeId = computed(() => String(route.params.typeId ?? ''))
const { enabled } = useAuthorizedStaffContext({ capability: 'circles.participationTypes' })
const detailQuery = useStaffParticipationTypeDetailQuery(typeId, enabled)
const tagsQuery = useStaffTagsQuery(enabled)
const updateMutation = useUpdateStaffParticipationTypeMutation(typeId)
const deleteMutation = useDeleteStaffParticipationTypeMutation(typeId)
const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))
const tagColors = computed(() => staffTagColorMap(tagsQuery.data.value ?? []))

const actionError = ref('')
const successMessage = ref('')

const participationTypeTabs = computed(() =>
  buildStaffParticipationTypeTabs(typeId.value, 'edit', detailQuery.data.value?.form)
)

const { form, submitEvent } = useServerSyncedForm({
  schema: staffParticipationTypeEditFormSchema,
  input: () => staffParticipationTypeInput(detailQuery.data.value),
  source: () => detailQuery.data.value,
  sourceKey: typeId,
  disabled: () => !detailQuery.data.value || deleteMutation.isPending.value,
  errorMessage: extractStaffParticipationTypeValidationMessage,
  saveInput: async (input) => {
    const saved = await updateMutation.mutateAsync(input)
    return { input: staffParticipationTypeInput(saved), sourceKey: saved.id }
  },
  onSaved: () => {
    successMessage.value = '参加種別を更新しました。'
  }
})
const errorMessage = computed(() => actionError.value || form.errors?.[0] || '')
async function handleSave(event: SubmitEvent) {
  actionError.value = ''
  successMessage.value = ''
  await submitEvent(event)
}

async function handleDelete() {
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffParticipationTypeConfirmMessage())) {
    return
  }

  actionError.value = ''
  successMessage.value = ''
  try {
    await deleteMutation.mutateAsync()
    await router.push('/staff/circles/participation_types')
  } catch (error) {
    actionError.value = extractStaffParticipationTypeValidationMessage(error)
  }
}
</script>

<template>
  <TabbedSettingsPage :tabs="participationTypeTabs">
    <LoadingState v-if="detailQuery.isPending.value" />

    <form
      v-else-if="detailQuery.data.value"
      class="space-y-6"
      novalidate
      :aria-busy="form.isSubmitting"
      @submit="handleSave"
    >
      <SurfaceCard tag="header">
        <SurfaceHeader>
          <template #title>参加種別を編集</template>
          <template #description>参加種別名 : {{ detailQuery.data.value.name }}</template>
          <template #actions>
            <BaseButton
              variant="dangerOutline"
              size="sm"
              :disabled="deleteMutation.isPending.value"
              type="button"
              @click="handleDelete"
            >
              {{ deleteMutation.isPending.value ? '削除中...' : 'この参加種別を削除' }}
            </BaseButton>
          </template>
        </SurfaceHeader>
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
              <p class="text-base font-semibold text-body">参加種別名</p>
              <p class="text-xs text-muted-2">
                一般ユーザーに表示する名称です。模擬店や展示など、参加区分を分かりやすく入力します。
              </p>
            </div>
            <FormischField v-slot="{ field, control }" :of="form" :path="['name']" label="参加種別名">
              <input v-bind="control" v-model="field.input" name="name" type="text" />
            </FormischField>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-6">
            <div class="space-y-1">
              <p class="text-base font-semibold text-body">説明</p>
              <p class="text-xs text-muted-2">参加登録画面の案内として一般ユーザーに表示します。</p>
            </div>
            <FormischField v-slot="{ field, control }" :of="form" :path="['description']" label="説明">
              <textarea v-bind="control" v-model="field.input" class="min-h-24" name="description" />
            </FormischField>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-base font-semibold text-body">必要人数</p>
              <p class="text-xs text-muted-2">
                企画責任者を含む参加登録可能人数の下限と上限です。個人参加のみなら 1 を指定します。
              </p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <FormischField v-slot="{ field, control }" :of="form" :path="['usersCountMin']" label="最低人数">
                <input v-bind="control" v-model.number="field.input" min="1" name="usersCountMin" type="number" />
              </FormischField>
              <FormischField v-slot="{ field, control }" :of="form" :path="['usersCountMax']" label="最大人数">
                <input v-bind="control" v-model.number="field.input" min="1" name="usersCountMax" type="number" />
              </FormischField>
            </div>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
            <div class="space-y-1">
              <p class="text-base font-semibold text-body">付与タグ</p>
              <p class="text-xs text-muted-2">
                この設定を保存した後に作成される企画へ、自動で追加するタグを改行またはカンマ区切りで入力します。
              </p>
            </div>
            <div class="grid gap-3">
              <FormischField v-slot="{ field, control }" :of="form" :path="['tags']" label="付与タグ">
                <StaffTagPicker
                  :control="control"
                  :model-value="field.input ?? []"
                  @update:model-value="field.input = $event"
                  :available-tags="availableTags"
                  :tag-colors="tagColors"
                  name="tags"
                />
              </FormischField>
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
              <BaseButton variant="primary" size="wide" weight="bold" type="submit" :disabled="form.isSubmitting">
                {{ form.isSubmitting ? '保存中...' : '保存' }}
              </BaseButton>
            </ActionsFooter>
          </div>
        </template>
      </SettingsSection>
    </form>

    <ErrorState v-else message="参加種別を取得できませんでした。" />
  </TabbedSettingsPage>
</template>
