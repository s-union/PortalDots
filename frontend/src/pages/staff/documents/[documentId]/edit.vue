<script setup lang="ts">
definePage({
  path: '/staff/documents/:documentId/edit',
  meta: staffPageMeta('documents.edit')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { formatFileSize } from '@/lib/format/fileSize'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import FormField from '@/components/ui/FormField.vue'
import CheckboxField from '@/components/ui/CheckboxField.vue'
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
const detailEnabled = computed(() => staffStatusQuery.data.value?.authorized === true)
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
      circleId: document.circle.id,
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
      circleId: form.value.circleId,
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
    <LoadingState v-if="documentQuery.isPending.value" />

    <form v-else-if="documentQuery.data.value" class="space-y-6" @submit.prevent="handleSaveDocument">
      <div class="space-y-1 px-1">
        <h1 class="text-2xl font-semibold text-body">配布資料を編集</h1>
        <p class="text-sm text-muted">配布資料ID : {{ documentQuery.data.value.id }}</p>
        <p class="text-sm text-muted">対象企画 : {{ documentQuery.data.value.circle.name }}</p>
        <p class="text-sm text-muted">
          {{ formatDateTimeUpdated(documentQuery.data.value.updatedAt) }} /
          {{ documentQuery.data.value.extension || 'FILE' }} /
          {{ formatFileSize(documentQuery.data.value.sizeBytes) }}
        </p>
      </div>

      <SettingsSection title="配布資料">
        <SettingsRow>
          <div class="grid gap-4">
            <FormField label="配布資料名" label-class="font-medium">
              <input v-model="form.name" name="name" type="text" />
            </FormField>

            <FormField label="説明" label-class="font-medium">
              <textarea v-model="form.description" class="min-h-24" name="description" />
            </FormField>

            <FormField label="スタッフ用メモ" label-class="font-medium">
              <textarea v-model="form.notes" class="min-h-24" name="notes" />
            </FormField>

            <FormField label="ファイル差し替え" label-class="font-medium">
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
            </FormField>

            <CheckboxField v-model="form.isImportant" label="重要資料として扱う" name="isImportant" />

            <CheckboxField v-model="form.isPublic" label="公開する" name="isPublic" />
          </div>
        </SettingsRow>
      </SettingsSection>

      <AlertMessage v-if="successMessage" tone="info">{{ successMessage }}</AlertMessage>
      <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

      <div class="flex flex-wrap justify-end gap-3">
        <BaseButton
          variant="dangerOutline"
          size="lg"
          weight="semibold"
          :disabled="deleteDocumentMutation.isPending.value"
          type="button"
          @click="handleDeleteDocument"
        >
          削除
        </BaseButton>
        <BaseButton
          variant="primary"
          size="wide"
          weight="bold"
          :disabled="updateDocumentMutation.isPending.value"
          type="submit"
        >
          {{ updateDocumentMutation.isPending.value ? '保存中...' : '更新する' }}
        </BaseButton>
      </div>
    </form>

    <ErrorState v-else message="配布資料を取得できませんでした。" />
  </PageLayout>
</template>
