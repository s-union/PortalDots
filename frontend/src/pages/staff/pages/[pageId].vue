<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/pages/:pageId',
  meta: staffPageMeta('pages.edit')
})

import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { formatDateTime, formatDateTimeUpdated } from '@/lib/format/datetime'
import { useStaffDocumentsQuery } from '@/features/staff/documents/api'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import StaffPageEditorForm from '@/features/staff/pages/components/StaffPageEditorForm.vue'
import {
  extractStaffPagePublishedAtError,
  extractStaffPageValidationMessage,
  resolveStaffPagePublishStatus,
  staffPagePublishStatusLabels,
  staffPagePublishStatusTones,
  useDeleteStaffPageMutation,
  useStaffPageDetailQuery,
  useStaffPageForm,
  useUpdateStaffPageMutation
} from '@/features/staff/pages/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { useFormValidation, staffPageFormSchema } from '@/lib/form-validation'
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
const form = useStaffPageForm()
const errorMessage = ref('')
const successMessage = ref('')
const publishedAtError = ref('')

const { fieldErrors, validateAll, markTouched } = useFormValidation({
  schema: staffPageFormSchema,
  form: computed(() => ({ title: form.value.title, body: form.value.body }))
})

const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))
const availableDocuments = computed(() => documentsQuery.data.value ?? [])

const editorFieldErrors = computed(() =>
  publishedAtError.value ? { ...fieldErrors.value, publishedAt: publishedAtError.value } : fieldErrors.value
)

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

watch(
  () => pageQuery.data.value,
  (page) => {
    if (!page) {
      return
    }

    form.value = {
      title: page.title,
      body: page.body,
      notes: page.notes,
      isPinned: page.isPinned,
      isPublic: page.isPublic,
      viewableTags: [...page.viewableTags],
      documentIds: [...page.documentIds],
      sendEmails: page.mailScheduled,
      publishedAt: page.publishedAt
    }
  },
  { immediate: true }
)

async function handleSavePage() {
  errorMessage.value = ''
  successMessage.value = ''
  publishedAtError.value = ''

  if (!validateAll()) {
    await focusFirstInvalidField()
    return
  }

  try {
    const updatedPage = await updatePageMutation.mutateAsync({
      title: form.value.title,
      body: form.value.body,
      notes: form.value.notes,
      isPinned: form.value.isPinned,
      isPublic: form.value.isPublic,
      viewableTags: form.value.viewableTags,
      documentIds: form.value.documentIds,
      sendEmails: form.value.sendEmails,
      publishedAt: form.value.publishedAt
    })
    form.value.sendEmails = updatedPage.mailScheduled
    successMessage.value = 'お知らせを更新しました。'
  } catch (error) {
    errorMessage.value = extractStaffPageValidationMessage(error)
    publishedAtError.value = extractStaffPagePublishedAtError(error)
    await focusFirstInvalidField()
  }
}

async function focusFirstInvalidField() {
  await nextTick()
  const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]')
  invalid?.focus()
}

async function handleDeletePage() {
  if (typeof window !== 'undefined' && !window.confirm('このお知らせを削除しますか？')) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await deletePageMutation.mutateAsync()
    await router.push('/staff/pages')
  } catch (error) {
    errorMessage.value = extractStaffPageValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <LoadingState v-if="pageQuery.isPending.value" />

    <form v-else-if="pageQuery.data.value" class="space-y-6" @submit.prevent="handleSavePage">
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
            v-model="form"
            :available-tags="availableTags"
            :available-documents="availableDocuments"
            :documents-loading="documentsQuery.isPending.value"
            :error-message="errorMessage"
            :success-message="successMessage"
            submit-label="保存"
            :submitting="updatePageMutation.isPending.value"
            :field-errors="editorFieldErrors"
            :on-blur-field="markTouched"
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
