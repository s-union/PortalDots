<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/pages/:pageId',
  meta: staffPageMeta('pages.edit')
})

import { computed, ref } from 'vue'
import { useServerSyncedForm } from '@/features/forms/composables/useServerSyncedForm'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { formatDateTime, formatDateTimeUpdated } from '@/lib/format/datetime'
import { useStaffDocumentsQuery } from '@/features/staff/documents/api'
import { useStaffTagsQuery, staffTagColorMap } from '@/features/staff/masters/tags'
import StaffPageEditorForm from '@/features/staff/pages/components/StaffPageEditorForm.vue'
import {
  extractStaffPageValidationMessage,
  resolveStaffPagePublishStatus,
  staffPagePublishStatusLabels,
  staffPagePublishStatusTones,
  useDeleteStaffPageMutation,
  useStaffPageDetailQuery,
  staffPageInput,
  useUpdateStaffPageMutation
} from '@/features/staff/pages/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { staffPageFormSchema } from '@/lib/form-validation'
import LoadingState from '@/components/ui/LoadingState.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'

const route = useRoute('/staff/pages/[pageId]')
const router = useRouter()
const sessionStore = useSessionStore()
const pageId = computed(() => String(route.params.pageId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const pageQuery = useStaffPageDetailQuery(pageId, enabled)
const tagsQuery = useStaffTagsQuery(enabled)
const documentsQuery = useStaffDocumentsQuery(enabled)
const updatePageMutation = useUpdateStaffPageMutation(pageId)
const deletePageMutation = useDeleteStaffPageMutation(pageId)
const actionError = ref('')
const successMessage = ref('')

const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))
const tagColors = computed(() => staffTagColorMap(tagsQuery.data.value ?? []))
const availableDocuments = computed(() => documentsQuery.data.value ?? [])

const publishStatusBadge = computed(() => {
  const page = pageQuery.data.value
  if (!page) {
    return null
  }

  const status = resolveStaffPagePublishStatus(page)
  const label = staffPagePublishStatusLabels[status]
  return {
    tone: staffPagePublishStatusTones[status],
    label: status === 'scheduled' ? `${label}: ${formatDateTime(page.publishedAt)}` : label
  }
})

const { form, submitEvent } = useServerSyncedForm({
  schema: staffPageFormSchema,
  input: () => staffPageInput(pageQuery.data.value),
  source: () => pageQuery.data.value,
  sourceKey: pageId,
  disabled: () => !pageQuery.data.value || deletePageMutation.isPending.value,
  errorMessage: extractStaffPageValidationMessage,
  saveInput: async (input) => {
    const saved = await updatePageMutation.mutateAsync(input)
    return { input: staffPageInput(saved), sourceKey: saved.id }
  },
  onSaved: () => {
    successMessage.value = 'お知らせを更新しました。'
  }
})
const errorMessage = computed(() => actionError.value || form.errors?.[0] || '')
async function handleSavePage(event: SubmitEvent) {
  actionError.value = ''
  successMessage.value = ''
  await submitEvent(event)
}

async function handleDeletePage() {
  if (typeof window !== 'undefined' && !window.confirm('このお知らせを削除しますか？')) {
    return
  }

  actionError.value = ''
  successMessage.value = ''

  try {
    await deletePageMutation.mutateAsync()
    await router.push('/staff/pages')
  } catch (error) {
    actionError.value = extractStaffPageValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <LoadingState v-if="pageQuery.isPending.value" />

    <form
      v-else-if="pageQuery.data.value"
      class="space-y-6"
      novalidate
      :aria-busy="form.isSubmitting"
      @submit="handleSavePage"
    >
      <SurfaceCard>
        <SurfaceCardBand>
          <h1 class="text-2xl font-semibold text-body">お知らせを編集</h1>
          <div class="mt-3 flex flex-wrap gap-2">
            <StatusBadge v-if="publishStatusBadge" :tone="publishStatusBadge.tone" appearance="outlined">
              {{ publishStatusBadge.label }}
            </StatusBadge>
            <StatusBadge :tone="pageQuery.data.value.isPinned ? 'primary' : 'muted'" appearance="outlined">
              {{ pageQuery.data.value.isPinned ? '固定表示' : '通常表示' }}
            </StatusBadge>
          </div>
          <p class="mt-3 text-sm text-muted">お知らせID: {{ pageQuery.data.value.id }}</p>
          <p class="mt-1 text-sm text-muted">作成日時: {{ formatDateTimeUpdated(pageQuery.data.value.createdAt) }}</p>
          <p class="mt-1 text-sm text-muted">更新日時: {{ formatDateTimeUpdated(pageQuery.data.value.updatedAt) }}</p>
        </SurfaceCardBand>
        <div class="px-6 py-6">
          <StaffPageEditorForm
            :form="form"
            :available-tags="availableTags"
            :tag-colors="tagColors"
            :available-documents="availableDocuments"
            :documents-loading="documentsQuery.isPending.value"
            :error-message="errorMessage"
            :success-message="successMessage"
            submit-label="保存"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-5">
          <BaseButton
            variant="dangerOutline"
            size="wide"
            weight="bold"
            :disabled="deletePageMutation.isPending.value"
            type="button"
            @click="handleDeletePage"
          >
            {{ deletePageMutation.isPending.value ? '削除中...' : '削除' }}
          </BaseButton>
        </div>
      </SurfaceCard>
    </form>

    <AlertMessage v-else tone="danger"> お知らせを取得できませんでした。 </AlertMessage>
  </PageLayout>
</template>
