<script setup lang="ts">
import { computed, ref } from 'vue'
import StaffMasterEditorShell from '@/components/staff/StaffMasterEditorShell.vue'
import FormField from '@/components/ui/FormField.vue'
import {
  buildDeleteStaffContactCategoryConfirmMessage,
  type StaffContactCategory,
  useCreateStaffContactCategoryMutation,
  useDeleteStaffContactCategoryMutation,
  useUpdateStaffContactCategoryMutation
} from '@/features/staff/masters/contactCategories'
import { useStaffMasterEditor } from '@/features/staff/masters/useStaffMasterEditor'

const { category } = defineProps<{
  category: StaffContactCategory | null
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const createMutation = useCreateStaffContactCategoryMutation()
const updateMutation = useUpdateStaffContactCategoryMutation()
const deleteMutation = useDeleteStaffContactCategoryMutation()
const name = ref('')
const email = ref('')

const { errorMessage, successMessage, handleSave, handleDelete, isSaving, isDeleting } = useStaffMasterEditor({
  entity: computed(() => category),
  createMutation,
  updateMutation,
  deleteMutation,
  resetFields: () => {
    name.value = category?.name ?? ''
    email.value = category?.email ?? ''
  },
  validate: () => true,
  buildCreatePayload: () => ({ name: name.value, email: email.value }),
  buildUpdatePayload: () => ({ ...category!, name: name.value, email: email.value }),
  deleteConfirmMessage: (c: StaffContactCategory) => buildDeleteStaffContactCategoryConfirmMessage(c),
  successCreateMessage: 'お問い合わせ受付設定を作成しました。',
  successUpdateMessage: 'お問い合わせ受付設定を更新しました。',
  errorFallbackMessage: '問い合わせカテゴリの保存に失敗しました。',
  onSaved: () => emit('saved'),
  onDeleted: () => emit('deleted')
})
</script>

<template>
  <StaffMasterEditorShell
    :title="category ? 'お問い合わせ受付設定を編集' : 'メールアドレスを追加'"
    :description="'ポータルからのお問い合わせを振り分けるカテゴリ名と送信先メールを設定します。'"
    section-title="お問い合わせ受付設定"
    :success-message="successMessage"
    :error-message="errorMessage"
    :is-saving="isSaving"
    :is-deleting="isDeleting"
    :has-entity="category !== null"
    create-label="追加"
    save-label="保存"
    @save="handleSave"
    @delete="handleDelete"
  >
    <div class="grid gap-4">
      <FormField label="カテゴリ名" label-class="font-medium">
        <input v-model="name" name="name" type="text" />
      </FormField>

      <FormField label="送信先メールアドレス" label-class="font-medium">
        <input v-model="email" name="email" type="email" />
      </FormField>
    </div>
  </StaffMasterEditorShell>
</template>
