<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: 'documents.edit'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { formatFileSize } from '@/lib/format/fileSize'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildDeleteStaffDocumentConfirmMessage,
  buildStaffDocumentDownloadUrl,
  extractStaffDocumentValidationMessage,
  useDeleteStaffDocumentMutation,
  useStaffDocumentDetailQuery,
  useStaffDocumentForm,
  useUpdateStaffDocumentMutation
} from '@/features/staff/documents/api'

const route = useRoute('/staff/documents/[documentId]/edit')
const router = useRouter()
const sessionStore = useSessionStore()
const documentId = computed(() => String(route.params.documentId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const detailEnabled = computed(
  () => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null
)
const documentQuery = useStaffDocumentDetailQuery(documentId, detailEnabled)
const updateDocumentMutation = useUpdateStaffDocumentMutation(documentId)
const deleteDocumentMutation = useDeleteStaffDocumentMutation(documentId)
const form = useStaffDocumentForm()
const errorMessage = ref('')
const successMessage = ref('')

watch(
  () => documentQuery.data.value,
  (document) => {
    if (!document) {
      return
    }

    form.value = {
      name: document.name,
      description: document.description,
      notes: document.notes,
      isPublic: document.isPublic,
      isImportant: document.isImportant,
      file: null
    }
  },
  { immediate: true }
)

function handleFileChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  form.value.file = target.files?.[0] ?? target.files?.item(0) ?? null
}

async function handleSaveDocument() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await updateDocumentMutation.mutateAsync({
      name: form.value.name,
      description: form.value.description,
      notes: form.value.notes,
      isPublic: form.value.isPublic,
      isImportant: form.value.isImportant,
      file: form.value.file
    })
    form.value.file = null
    successMessage.value = '配布資料を更新しました。'
  } catch (error) {
    errorMessage.value = extractStaffDocumentValidationMessage(error)
  }
}

async function handleDeleteDocument() {
  const documentName = documentQuery.data.value?.name ?? 'この配布資料'
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffDocumentConfirmMessage(documentName))) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deleteDocumentMutation.mutateAsync()
    await router.push('/staff/documents')
  } catch (error) {
    errorMessage.value = extractStaffDocumentValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <BackLink to="/staff/documents"> 配布資料管理へ戻る </BackLink>

    <div v-if="documentQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <form v-else-if="documentQuery.data.value" class="space-y-6" @submit.prevent="handleSaveDocument">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Document Detail</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">配布資料を編集</h2>
        <div class="mt-3 text-sm text-muted">配布資料ID : {{ documentQuery.data.value.id }}</div>
        <div class="mt-1 text-sm text-muted">{{ sessionStore.currentCircle?.name }}</div>
        <div class="mt-3 text-sm text-muted">
          {{ documentQuery.data.value.updatedAt }} 更新 / {{ documentQuery.data.value.extension || 'FILE' }} /
          {{ formatFileSize(documentQuery.data.value.sizeBytes) }}
        </div>
      </SurfaceCard>

      <SettingsSection title="配布資料">
        <SettingsRow>
          <div class="grid gap-4">
            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">配布資料名</span>
              <input v-model="form.name" name="name" type="text" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">説明</span>
              <textarea v-model="form.description" class="min-h-24" name="description" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">スタッフ用メモ</span>
              <textarea v-model="form.notes" class="min-h-24" name="notes" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">ファイル差し替え</span>
              <input name="file" type="file" @change="handleFileChange" />
              <span class="text-xs text-muted">
                現在のファイル:
                <a
                  :href="buildStaffDocumentDownloadUrl(documentQuery.data.value.id)"
                  class="text-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  {{ documentQuery.data.value.filename }}
                </a>
                / {{ documentQuery.data.value.mimeType }}
              </span>
            </label>

            <label class="flex items-center gap-3 text-sm text-body">
              <input v-model="form.isImportant" name="isImportant" type="checkbox" />
              重要資料として扱う
            </label>

            <label class="flex items-center gap-3 text-sm text-body">
              <input v-model="form.isPublic" name="isPublic" type="checkbox" />
              公開する
            </label>
          </div>
        </SettingsRow>
      </SettingsSection>

      <AlertMessage v-if="successMessage" tone="info">{{ successMessage }}</AlertMessage>
      <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

      <div class="flex flex-wrap justify-end gap-3">
        <button
          class="rounded border border-danger px-5 py-3 font-semibold text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="deleteDocumentMutation.isPending.value"
          type="button"
          @click="handleDeleteDocument"
        >
          削除
        </button>
        <button
          class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="updateDocumentMutation.isPending.value"
          type="submit"
        >
          {{ updateDocumentMutation.isPending.value ? '保存中...' : '更新する' }}
        </button>
      </div>
    </form>

    <div v-else class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
      配布資料を取得できませんでした。
    </div>
  </PageLayout>
</template>
