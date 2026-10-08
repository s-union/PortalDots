<script setup lang="ts">
import { computed } from 'vue'
import { getInput, type FormStore } from '@formisch/vue'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import FormischField from '@/components/forms/FormischField.vue'
import DateTimeInput from '@/components/forms/DateTimeInput.vue'
import InfoBox from '@/components/ui/InfoBox.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CheckboxField from '@/components/ui/CheckboxField.vue'
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
</script>

<template>
  <div class="grid gap-4">
    <FormischField
      id="staff-page-title-input"
      v-slot="{ field, control }"
      :of="form"
      :path="['title']"
      label="タイトル"
      label-class="font-medium"
      required
    >
      <input v-bind="control" v-model="field.input" type="text" required />
    </FormischField>
    <FormischField
      id="staff-page-body"
      v-slot="{ field, control }"
      :of="form"
      :path="['body']"
      label="本文"
      label-class="font-medium"
      helper="Markdown で入力できます。表、取り消し線、タスクリスト、脚注は GFM として表示されます。"
      required
    >
      <MarkdownEditorField
        :control="control"
        :model-value="field.input ?? ''"
        @update:model-value="field.input = $event"
        min-height-class="min-h-56"
        name="body"
      />
    </FormischField>
    <FormischField
      id="staff-page-notes-input"
      v-slot="{ field, control }"
      :of="form"
      :path="['notes']"
      label="スタッフ用メモ"
      label-class="font-medium"
    >
      <textarea v-bind="control" v-model="field.input" class="min-h-28" />
    </FormischField>
    <FormischField
      id="staff-page-tags-input"
      v-slot="{ field, control }"
      :of="form"
      :path="['viewableTags']"
      label="閲覧可能なタグ"
      label-class="font-medium"
      helper="空欄なら全員に公開、指定すると一致する企画タグだけに限定公開します。"
    >
      <StaffTagPicker
        :control="control"
        :model-value="field.input ?? []"
        @update:model-value="field.input = $event"
        :available-tags="availableTags"
        :tag-colors="tagColors"
        name="viewableTags"
      />
    </FormischField>
    <FormischField
      v-slot="{ field, control }"
      :of="form"
      :path="['documentIds']"
      as="fieldset"
      label="関連する配布資料"
      label-class="font-medium"
    >
      <InfoBox v-if="documentsLoading" class="text-muted">配布資料を読み込み中...</InfoBox>
      <InfoBox v-else-if="availableDocuments.length === 0" class="text-muted">選択できる配布資料はありません。</InfoBox>
      <div v-else class="grid gap-2 rounded border border-border bg-surface-light p-4">
        <label v-for="document in availableDocuments" :key="document.id" class="flex items-start gap-3">
          <input
            v-bind="control"
            :id="`${control.id}-${document.id}`"
            v-model="field.input"
            :value="document.id"
            type="checkbox"
          />
          <span
            ><strong class="text-body">{{ document.name }}</strong
            ><span class="block text-xs text-muted">{{ document.description || '説明なし' }}</span></span
          >
        </label>
      </div>
    </FormischField>
    <FormischField v-slot="{ field, control }" :of="form" :path="['isPinned']" as="fieldset" label="表示位置">
      <CheckboxField
        :control="control"
        :model-value="field.input ?? false"
        @update:model-value="field.input = $event"
        label="固定表示する"
        name="isPinned"
      />
    </FormischField>
    <FormischField v-slot="{ field, control }" :of="form" :path="['isPublic']" as="fieldset" label="公開設定">
      <CheckboxField
        :control="control"
        :model-value="field.input ?? false"
        @update:model-value="field.input = $event"
        label="公開する"
        name="isPublic"
      />
    </FormischField>
    <FormischField
      id="staff-page-published-at-input"
      v-slot="{ field, control }"
      :of="form"
      :path="['publishedAt']"
      label="公開日時（日本時間）"
      label-class="font-medium"
      :helper="publishedAtHelper"
    >
      <DateTimeInput :control="control" v-model="field.input" />
    </FormischField>
    <FormischField
      v-slot="{ field, control }"
      :of="form"
      :path="['sendEmails']"
      as="fieldset"
      label="メール配信"
      helper="公開日時になったタイミングでメールを配信します。公開日時が空欄または過去の日時の場合は、保存後1分以内に配信します。予約中のメール配信は、チェックを外して保存するとキャンセルされます。"
    >
      <CheckboxField
        :control="control"
        :model-value="field.input ?? false"
        @update:model-value="field.input = $event"
        label="公開時にメールで配信する"
        name="sendEmails"
      />
    </FormischField>
    <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
    <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
    <div class="flex justify-end">
      <BaseButton variant="primary" size="wide" weight="bold" :disabled="form.isSubmitting" type="submit">{{
        form.isSubmitting ? '保存中...' : submitLabel
      }}</BaseButton>
    </div>
  </div>
</template>
