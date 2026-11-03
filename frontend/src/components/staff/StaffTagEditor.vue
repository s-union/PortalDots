<script setup lang="ts">
import { computed } from 'vue'
import StaffMasterEditorShell from '@/components/staff/StaffMasterEditorShell.vue'
import { SchemaFormFields } from '@/features/forms/schema-form'
import { buildDeleteStaffTagConfirmMessage } from '@/features/staff/masters/messages'
import {
  type StaffTag,
  useCreateStaffTagMutation,
  useDeleteStaffTagMutation,
  useUpdateStaffTagMutation
} from '@/features/staff/masters/tags'
import { staffTagFormSchema } from '@/lib/form-validation'
import { useStaffMasterEditor } from '@/features/staff/masters/useStaffMasterEditor'

const { tag } = defineProps<{
  tag: StaffTag | null
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const createMutation = useCreateStaffTagMutation()
const updateMutation = useUpdateStaffTagMutation()
const deleteMutation = useDeleteStaffTagMutation()
const { form, errorMessage, successMessage, handleSave, handleDelete, isSaving, isDeleting } = useStaffMasterEditor({
  entity: computed(() => tag),
  schema: staffTagFormSchema,
  input: (entity) => ({ name: entity?.name ?? '', color: entity?.color ?? 'gray' }),
  create: (input) => createMutation.mutateAsync(input),
  update: (entity, input) => updateMutation.mutateAsync({ ...entity, ...input }),
  deleteMutation,
  deleteConfirmMessage: (t: StaffTag) => buildDeleteStaffTagConfirmMessage(t.name),
  successCreateMessage: 'タグを作成しました。',
  successUpdateMessage: 'タグを更新しました。',
  errorFallbackMessage: 'タグの保存に失敗しました。',
  onSaved: () => emit('saved'),
  onDeleted: () => emit('deleted')
})
</script>

<template>
  <StaffMasterEditorShell
    :title="tag ? 'タグを編集' : '新規タグ'"
    :description="tag ? '企画分類や公開条件に使う既存タグを編集します。' : '企画分類や公開条件に使うタグを追加します。'"
    section-title="タグ設定"
    :success-message="successMessage"
    :error-message="errorMessage"
    :is-saving="isSaving"
    :is-deleting="isDeleting"
    :has-entity="tag !== null"
    create-label="作成"
    save-label="保存"
    @save="handleSave"
    @delete="handleDelete"
  >
    <SchemaFormFields required-label="" :of="form" :schema="staffTagFormSchema" />
  </StaffMasterEditorShell>
</template>
