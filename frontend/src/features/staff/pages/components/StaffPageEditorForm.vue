<script setup lang="ts">
import { computed } from 'vue'
import { getInput, type FormStore } from '@formisch/vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { SchemaFormFields, type FieldOverrides } from '@/features/forms/schema-form'
import { staffPageFormSchema } from '@/lib/form-validation'
import type { StaffPageDocument } from '@/features/staff/pages/api'

const {
  form,
  availableTags,
  tagColors = {},
  availableDocuments,
  documentsLoading,
  errorMessage,
  successMessage,
  submitLabel
} = defineProps<{
  form: FormStore<typeof staffPageFormSchema>
  availableTags: string[]
  tagColors?: Record<string, string>
  availableDocuments: StaffPageDocument[]
  documentsLoading: boolean
  errorMessage?: string
  successMessage?: string
  submitLabel: string
}>()
const publishedAtHelper = computed(() =>
  getInput(form, { path: ['isPublic'] })
    ? '未来の日時を指定すると、その時刻から公開される予約公開になります。空欄の場合はすぐに公開されます。日時は日本時間で指定してください。'
    : '「公開する」がオフの間は、日時を指定してもお知らせは公開されません。予約公開するには「公開する」をオンにしてください。日時は日本時間で指定してください。'
)

// viewableTags/documentIds picker data comes from queries; documentIds' description falls back to
// '説明なし' (matching the pre-schema-driven markup) so the checkbox list always shows a secondary
// line; publishedAt's helper depends on the current isPublic value, so it can't live in the schema.
const overrides = computed<FieldOverrides<typeof staffPageFormSchema.entries>>(() => ({
  viewableTags: { availableTags, tagColors },
  documentIds: {
    loading: documentsLoading,
    options: availableDocuments.map((document) => ({
      value: document.id,
      label: document.name,
      description: document.description || '説明なし'
    }))
  },
  publishedAt: { helper: publishedAtHelper.value }
}))
</script>

<template>
  <div class="grid gap-4">
    <SchemaFormFields :of="form" :schema="staffPageFormSchema" :overrides="overrides" />
    <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
    <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
    <div class="flex justify-end">
      <BaseButton variant="primary" size="wide" weight="bold" :disabled="form.isSubmitting" type="submit">{{
        form.isSubmitting ? '保存中...' : submitLabel
      }}</BaseButton>
    </div>
  </div>
</template>
