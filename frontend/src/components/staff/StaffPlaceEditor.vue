<script setup lang="ts">
import { computed } from 'vue'
import StaffMasterEditorShell from '@/components/staff/StaffMasterEditorShell.vue'
import { SchemaFormFields } from '@/features/forms/schema-form'
import {
  buildDeleteStaffPlaceConfirmMessage,
  type StaffPlace,
  useCreateStaffPlaceMutation,
  useDeleteStaffPlaceMutation,
  useUpdateStaffPlaceMutation
} from '@/features/staff/masters/places'
import { staffPlaceFormSchema } from '@/lib/form-validation'
import { useStaffMasterEditor } from '@/features/staff/masters/useStaffMasterEditor'

const { place } = defineProps<{
  place: StaffPlace | null
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const createMutation = useCreateStaffPlaceMutation()
const updateMutation = useUpdateStaffPlaceMutation()
const deleteMutation = useDeleteStaffPlaceMutation()
const { form, errorMessage, successMessage, handleSave, handleDelete, isSaving, isDeleting } = useStaffMasterEditor({
  entity: computed(() => place),
  schema: staffPlaceFormSchema,
  input: (entity) => ({ name: entity?.name ?? '', type: entity?.type ?? 1, notes: entity?.notes ?? '' }),
  create: (input) => createMutation.mutateAsync(input),
  update: (entity, input) => updateMutation.mutateAsync({ ...entity, ...input }),
  deleteMutation,
  deleteConfirmMessage: (p: StaffPlace) => buildDeleteStaffPlaceConfirmMessage(p.name),
  successCreateMessage: '場所を作成しました。',
  successUpdateMessage: '場所を更新しました。',
  errorFallbackMessage: '場所の保存に失敗しました。',
  onSaved: () => emit('saved'),
  onDeleted: () => emit('deleted')
})
</script>

<template>
  <StaffMasterEditorShell
    :title="place ? '場所を編集' : '新規場所'"
    :description="place ? '既存の場所情報を編集します。' : '企画で利用する場所情報を追加します。'"
    section-title="場所設定"
    :success-message="successMessage"
    :error-message="errorMessage"
    :is-saving="isSaving"
    :is-deleting="isDeleting"
    :has-entity="place !== null"
    create-label="作成"
    save-label="保存"
    @save="handleSave"
    @delete="handleDelete"
  >
    <div class="grid gap-4">
      <SchemaFormFields :of="form" :schema="staffPlaceFormSchema" />
    </div>
  </StaffMasterEditorShell>
</template>
