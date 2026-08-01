<script setup lang="ts">
import { computed } from 'vue'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import { cn } from '@/lib/ui/cn'
import { formControlVariants } from '@/lib/ui/variants'
import { formatDateTimeLocalValue, parseDateTimeLocalValue } from '@/lib/format/datetime'
import type { MutateStaffPagePayload, StaffPageDocument } from '@/features/staff/pages/api'
import FormError from '@/components/ui/FormError.vue'
import FormField from '@/components/ui/FormField.vue'
import InfoBox from '@/components/ui/InfoBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CheckboxField from '@/components/ui/CheckboxField.vue'

const form = defineModel<MutateStaffPagePayload>({ required: true })

const publishedAtInput = computed({
  get: () => formatDateTimeLocalValue(form.value.publishedAt ?? ''),
  set: (value: string) => {
    const parsed = parseDateTimeLocalValue(value, form.value.publishedAt ?? '')
    form.value.publishedAt = parsed.length > 0 ? parsed : null
  }
})

const publishedAtHelper = computed(() =>
  form.value.isPublic
    ? '未来の日時を指定すると、その時刻から公開される予約公開になります。空欄の場合はすぐに公開されます。日時は日本時間で指定してください。'
    : '「公開する」がオフの間は、日時を指定してもお知らせは公開されません。予約公開するには「公開する」をオンにしてください。日時は日本時間で指定してください。'
)

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
    <FormField
      id="staff-page-title-input"
      as="div"
      label="タイトル"
      label-class="font-medium"
      :error="fieldErrors?.title"
    >
      <input
        id="staff-page-title-input"
        v-model="form.title"
        aria-describedby="staff-page-title-input-error"
        :aria-invalid="Boolean(fieldErrors?.title)"
        :class="[formControlVariants(), { 'border-danger': fieldErrors?.title }]"
        name="title"
        type="text"
        @blur="onBlurField?.('title')"
        @input="onBlurField?.('title')"
      />
    </FormField>

    <div class="grid gap-2 text-base text-body">
      <label for="staff-page-body" class="font-medium">本文</label>
      <MarkdownEditorField
        id="staff-page-body"
        v-model="form.body"
        aria-describedby="staff-page-body-error staff-page-body-helper"
        :aria-invalid="Boolean(fieldErrors?.body)"
        min-height-class="min-h-56"
        name="body"
      />
      <FormError v-if="fieldErrors?.body" id="staff-page-body-error" :message="fieldErrors.body" />
      <p id="staff-page-body-helper" class="text-xs text-muted">
        Markdown で入力できます。表、取り消し線、タスクリスト、脚注は GFM として表示されます。
      </p>
    </div>

    <FormField id="staff-page-notes-input" as="div" label="スタッフ用メモ" label-class="font-medium">
      <textarea
        id="staff-page-notes-input"
        v-model="form.notes"
        :class="cn(formControlVariants(), 'min-h-28')"
        name="notes"
      />
    </FormField>

    <FormField
      label="閲覧可能なタグ"
      id="staff-page-tags-input"
      as="div"
      label-class="font-medium"
      helper="空欄なら全員に公開、指定すると一致する企画タグだけに限定公開します。"
    >
      <StaffTagPicker
        id="staff-page-tags-input"
        v-model="form.viewableTags"
        aria-describedby="staff-page-tags-input-helper"
        :available-tags="availableTags"
        name="viewableTags"
      />
    </FormField>

    <fieldset class="grid gap-2 text-base text-body">
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

    <CheckboxField v-model="form.isPinned" label="固定表示する" name="isPinned" />

    <CheckboxField v-model="form.isPublic" label="公開する" name="isPublic" />

    <FormField
      id="staff-page-published-at-input"
      as="div"
      label="公開日時（日本時間）"
      label-class="font-medium"
      :helper="publishedAtHelper"
      :error="fieldErrors?.publishedAt"
    >
      <input
        id="staff-page-published-at-input"
        v-model="publishedAtInput"
        aria-describedby="staff-page-published-at-input-helper staff-page-published-at-input-error"
        :aria-invalid="Boolean(fieldErrors?.publishedAt)"
        :class="[formControlVariants(), { 'border-danger': fieldErrors?.publishedAt }]"
        name="publishedAt"
        type="datetime-local"
      />
    </FormField>

    <div class="grid gap-1">
      <CheckboxField v-model="form.sendEmails" label="公開時にメールで配信する" name="sendEmails" />
      <p class="text-xs text-muted">
        公開日時になったタイミングでメールを配信します。公開日時が空欄または過去の日時の場合は、保存後1分以内に配信します。
        予約中のメール配信は、チェックを外して保存するとキャンセルされます。
      </p>
    </div>

    <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
    <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

    <div class="flex justify-end">
      <BaseButton variant="primary" size="wide" weight="bold" :disabled="submitting" type="submit">
        {{ submitting ? '保存中...' : submitLabel }}
      </BaseButton>
    </div>
  </div>
</template>
