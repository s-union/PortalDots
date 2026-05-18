<script setup lang="ts">
import { computed, ref } from 'vue'
import StaffMasterEditorShell from '@/components/staff/StaffMasterEditorShell.vue'
import FormField from '@/components/ui/FormField.vue'
import { buildDeleteStaffTagConfirmMessage } from '@/features/staff/masters/messages'
import {
  type StaffTag,
  useCreateStaffTagMutation,
  useDeleteStaffTagMutation,
  useUpdateStaffTagMutation
} from '@/features/staff/masters/tags'
import { useFormValidation, staffTagFormSchema } from '@/lib/form-validation'
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
const name = ref('')

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: staffTagFormSchema,
  form: computed(() => ({ name: name.value }))
})

const { errorMessage, successMessage, handleSave, handleDelete, isSaving, isDeleting } = useStaffMasterEditor({
  entity: computed(() => tag),
  createMutation,
  updateMutation,
  deleteMutation,
  resetFields: () => {
    name.value = tag?.name ?? ''
  },
  validate: () => validateAll(),
  buildCreatePayload: () => name.value,
  buildUpdatePayload: () => ({ ...tag!, name: name.value }),
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
    <FormField label="タグ名" label-class="font-medium" :error="getFieldError('name')">
      <input
        v-model="name"
        name="name"
        type="text"
        :class="{ 'border-danger': getFieldError('name') }"
        @blur="markTouched('name')"
        @input="markTouched('name')"
      />
    </FormField>
  </StaffMasterEditorShell>
</template>
