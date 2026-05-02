<script setup lang="ts">
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import { cn } from '@/lib/ui/cn'
import { formControlVariants } from '@/lib/ui/variants'
import type { MutateStaffPagePayload, StaffPageDocument } from '@/features/staff/pages/api'
import FormError from '@/components/ui/FormError.vue'
import FormField from '@/components/ui/FormField.vue'
import InfoBox from '@/components/ui/InfoBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CheckboxField from '@/components/ui/CheckboxField.vue'

const form = defineModel<MutateStaffPagePayload>({ required: true })

const {
  availableTags,
  availableDocuments,
  documentsLoading,
  errorMessage,
  successMessage,
  submitLabel,
  submitting,
  fieldErrors,
  onBlurField
} = defineProps<{
  availableTags: string[]
  availableDocuments: StaffPageDocument[]
  documentsLoading: boolean
  errorMessage?: string
  successMessage?: string
  submitLabel: string
  submitting: boolean
  fieldErrors?: Record<string, string>
  onBlurField?: (field: 'title' | 'body') => void
}>()

function handleDocumentChange(documentId: string, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  if (target.checked) {
    form.value.documentIds = [...new Set([...form.value.documentIds, documentId])]
    return
  }

  form.value.documentIds = form.value.documentIds.filter((value) => value !== documentId)
}
</script>

<template>
  <div class="grid gap-4">
    <FormField as="div" label="タイトル" label-class="font-medium" :error="fieldErrors?.title">
      <input
        v-model="form.title"
        :class="[formControlVariants(), { 'border-danger': fieldErrors?.title }]"
        name="title"
        type="text"
        @blur="onBlurField?.('title')"
        @input="onBlurField?.('title')"
      />
    </FormField>

    <div class="grid gap-2 text-sm text-body">
      <span class="font-medium">本文</span>
      <MarkdownEditorField v-model="form.body" min-height-class="min-h-56" name="body" />
      <FormError v-if="fieldErrors?.body" :message="fieldErrors.body" />
      <p class="text-xs text-muted">
        Markdown で入力できます。表、取り消し線、タスクリスト、脚注は GFM として表示されます。
      </p>
    </div>

    <FormField label="スタッフ用メモ" label-class="font-medium">
      <textarea v-model="form.notes" :class="cn(formControlVariants(), 'min-h-28')" name="notes" />
    </FormField>

    <label class="grid gap-2 text-sm text-body">
      <span class="font-medium">閲覧可能なタグ</span>
      <StaffTagPicker v-model="form.viewableTags" :available-tags="availableTags" name="viewableTags" />
      <p class="text-xs text-muted">空欄なら全員に公開、指定すると一致する企画タグだけに限定公開します。</p>
    </label>

    <fieldset class="grid gap-2 text-sm text-body">
      <legend class="font-medium">関連する配布資料</legend>
      <InfoBox v-if="documentsLoading" class="text-muted"> 配布資料を読み込み中... </InfoBox>
      <InfoBox v-else-if="availableDocuments.length === 0" class="text-muted">
        選択できる配布資料はありません。
      </InfoBox>
      <div v-else class="grid gap-2 rounded border border-border bg-surface-light p-4">
        <label v-for="document in availableDocuments" :key="document.id" class="flex items-start gap-3">
          <input
            :checked="form.documentIds.includes(document.id)"
            type="checkbox"
            @change="handleDocumentChange(document.id, $event)"
          />
          <span>
            <strong class="text-body">{{ document.name }}</strong>
            <span class="block text-xs text-muted">{{ document.description || '説明なし' }}</span>
          </span>
        </label>
      </div>
    </fieldset>

    <CheckboxField v-model="form.isPinned" label="固定表示する" />

    <CheckboxField v-model="form.isPublic" label="公開する" />

    <CheckboxField v-model="form.sendEmails" label="保存後にメール配信を予約する" />

    <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
    <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

    <div class="flex justify-end">
      <BaseButton variant="primary" size="wide" weight="bold" :disabled="submitting" type="submit">
        {{ submitting ? '保存中...' : submitLabel }}
      </BaseButton>
    </div>
  </div>
</template>
