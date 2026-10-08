<script setup lang="ts">
import { computed } from 'vue'
import StaffMasterEditorShell from '@/components/staff/StaffMasterEditorShell.vue'
import FormischField from '@/components/forms/FormischField.vue'
import { buildDeleteStaffTagConfirmMessage } from '@/features/staff/masters/messages'
import {
  type StaffTag,
  useCreateStaffTagMutation,
  useDeleteStaffTagMutation,
  useUpdateStaffTagMutation
} from '@/features/staff/masters/tags'
import { staffTagFormSchema } from '@/lib/form-validation'
import { useStaffMasterEditor } from '@/features/staff/masters/useStaffMasterEditor'
import { tagColors, type TagColor, tagColorClass } from '@/lib/tagColor'

const { tag } = defineProps<{
  tag: StaffTag | null
}>()

const emit = defineEmits<{
  saved: []
  deleted: []
}>()

const colorLabels: Record<TagColor, string> = {
  gray: 'グレー',
  red: '赤',
  orange: 'オレンジ',
  green: '緑',
  blue: '青',
  purple: '紫'
}

const colorOptions = tagColors.map((value) => ({ value, label: colorLabels[value] }))

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
    <FormischField v-slot="{ field, control }" :of="form" :path="['name']" label="タグ名" label-class="font-medium">
      <input v-bind="control" v-model="field.input" name="name" type="text" />
    </FormischField>

    <FormischField
      v-slot="{ field, control }"
      :of="form"
      :path="['color']"
      as="fieldset"
      label="タグの色"
      label-class="font-medium"
      helper="タグ一覧や絞り込みでタグを色分けして表示します。"
    >
      <div class="flex flex-wrap gap-2">
        <label
          v-for="option in colorOptions"
          :key="option.value"
          :class="[
            'inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm font-medium transition focus-within:ring-2 focus-within:ring-primary',
            tagColorClass(option.value),
            field.input === option.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
          ]"
        >
          <input
            v-bind="control"
            v-model="field.input"
            :value="option.value"
            :id="`${control.id}-${option.value}`"
            name="color"
            type="radio"
            class="sr-only"
          />
          {{ option.label }}
        </label>
      </div>
    </FormischField>
  </StaffMasterEditorShell>
</template>
