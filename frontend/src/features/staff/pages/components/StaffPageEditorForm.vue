<script setup lang="ts">
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import { cn } from '@/lib/ui/cn'
import { formControlVariants } from '@/lib/ui/variants'
import type { MutateStaffPagePayload, StaffPageDocument } from '@/features/staff/pages/api'

const form = defineModel<MutateStaffPagePayload>({ required: true })

defineProps<{
  availableTags: string[]
  availableDocuments: StaffPageDocument[]
  documentsLoading: boolean
  errorMessage?: string
  successMessage?: string
  submitLabel: string
  submitting: boolean
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
    <label class="grid gap-2 text-sm text-body">
      <span class="font-medium">タイトル</span>
      <input v-model="form.title" :class="formControlVariants()" name="title" type="text" />
    </label>

    <label class="grid gap-2 text-sm text-body">
      <span class="font-medium">本文</span>
      <textarea v-model="form.body" :class="cn(formControlVariants(), 'min-h-56')" name="body" />
      <p class="text-xs text-muted">
        Markdown で入力できます。表、取り消し線、タスクリスト、脚注は GFM として表示されます。
      </p>
    </label>

    <label class="grid gap-2 text-sm text-body">
      <span class="font-medium">スタッフ用メモ</span>
      <textarea v-model="form.notes" :class="cn(formControlVariants(), 'min-h-28')" name="notes" />
    </label>

    <label class="grid gap-2 text-sm text-body">
      <span class="font-medium">閲覧可能なタグ</span>
      <StaffTagPicker v-model="form.viewableTags" :available-tags="availableTags" name="viewableTags" />
      <p class="text-xs text-muted">空欄なら全員に公開、指定すると一致する企画タグだけに限定公開します。</p>
    </label>

    <fieldset class="grid gap-2 text-sm text-body">
      <legend class="font-medium">関連する配布資料</legend>
      <div v-if="documentsLoading" class="rounded border border-border bg-surface-light px-4 py-3 text-muted">
        配布資料を読み込み中...
      </div>
      <div
        v-else-if="availableDocuments.length === 0"
        class="rounded border border-border bg-surface-light px-4 py-3 text-muted"
      >
        選択できる配布資料はありません。
      </div>
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

    <label class="flex items-center gap-3 text-sm text-body">
      <input v-model="form.isPinned" name="isPinned" type="checkbox" />
      固定表示する
    </label>

    <label class="flex items-center gap-3 text-sm text-body">
      <input v-model="form.isPublic" name="isPublic" type="checkbox" />
      公開する
    </label>

    <label class="flex items-center gap-3 text-sm text-body">
      <input v-model="form.sendEmails" name="sendEmails" type="checkbox" />
      保存後にメール配信を予約する
    </label>
    <p class="text-sm text-muted">
      実送信ではなくキュー登録のみ行います。不要なら `/staff/mails` で全件キャンセルできます。
    </p>

    <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
    <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

    <div class="flex justify-end">
      <button
        class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="submitting"
        type="submit"
      >
        {{ submitting ? '保存中...' : submitLabel }}
      </button>
    </div>
  </div>
</template>
