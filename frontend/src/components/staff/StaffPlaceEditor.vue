<script setup lang="ts">
import { computed, ref } from 'vue'
import StaffMasterEditorShell from '@/components/staff/StaffMasterEditorShell.vue'
import FormField from '@/components/ui/FormField.vue'
import {
  buildDeleteStaffPlaceConfirmMessage,
  type StaffPlace,
  useCreateStaffPlaceMutation,
  useDeleteStaffPlaceMutation,
  useUpdateStaffPlaceMutation
} from '@/features/staff/masters/places'
import { useFormValidation, staffPlaceFormSchema } from '@/lib/form-validation'
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
const name = ref('')
const type = ref(1)
const notes = ref('')

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: staffPlaceFormSchema,
  form: computed(() => ({ name: name.value, type: type.value }))
})

const { errorMessage, successMessage, handleSave, handleDelete, isSaving, isDeleting } = useStaffMasterEditor({
  entity: computed(() => place),
  createMutation,
  updateMutation,
  deleteMutation,
  resetFields: () => {
    name.value = place?.name ?? ''
    type.value = place?.type ?? 1
    notes.value = place?.notes ?? ''
  },
  validate: () => validateAll(),
  buildCreatePayload: () => ({ name: name.value, type: type.value, notes: notes.value }),
  buildUpdatePayload: () => ({ ...place!, name: name.value, type: type.value, notes: notes.value }),
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
      <FormField label="場所名" label-class="font-medium" :error="getFieldError('name')">
        <input
          v-model="name"
          name="name"
          type="text"
          :class="{ 'border-danger': getFieldError('name') }"
          @blur="markTouched('name')"
          @input="markTouched('name')"
        />
      </FormField>

      <FormField label="タイプ" label-class="font-medium" :error="getFieldError('type')">
        <select
          v-model.number="type"
          name="type"
          :class="{ 'border-danger': getFieldError('type') }"
          @blur="markTouched('type')"
          @change="markTouched('type')"
        >
          <option :value="1">屋内</option>
          <option :value="2">屋外</option>
          <option :value="3">特殊場所</option>
        </select>
      </FormField>

      <FormField label="スタッフ用メモ" label-class="font-medium">
        <textarea v-model="notes" class="min-h-24" name="notes" />
      </FormField>
    </div>
  </StaffMasterEditorShell>
</template>
