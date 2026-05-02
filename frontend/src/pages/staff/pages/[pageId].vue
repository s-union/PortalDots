<script setup lang="ts">
definePage({
  path: '/staff/pages/:pageId',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'pages.edit'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { useStaffDocumentsQuery } from '@/features/staff/documents/api'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import StaffPageEditorForm from '@/features/staff/pages/components/StaffPageEditorForm.vue'
import {
  extractStaffPageValidationMessage,
  useDeleteStaffPageMutation,
  usePatchStaffPagePinMutation,
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
const patchPinMutation = usePatchStaffPagePinMutation(pageId)
const form = useStaffPageForm()
const errorMessage = ref('')
const successMessage = ref('')

const { fieldErrors, validateAll, markTouched } = useFormValidation({
  schema: staffPageFormSchema,
  form: computed(() => ({ title: form.value.title, body: form.value.body }))
})

const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))
const availableDocuments = computed(() => documentsQuery.data.value ?? [])

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
      sendEmails: false
    }
  },
  { immediate: true }
)

async function handleSavePage() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateAll()) {
    return
  }

  try {
    await updatePageMutation.mutateAsync({
      title: form.value.title,
      body: form.value.body,
      notes: form.value.notes,
      isPinned: form.value.isPinned,
      isPublic: form.value.isPublic,
      viewableTags: form.value.viewableTags,
      documentIds: form.value.documentIds,
      sendEmails: form.value.sendEmails
    })
    form.value.sendEmails = false
    successMessage.value = 'お知らせを更新しました。'
  } catch (error) {
    errorMessage.value = extractStaffPageValidationMessage(error)
  }
}

async function handleTogglePin() {
  if (!pageQuery.data.value) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    const nextPinned = !pageQuery.data.value.isPinned
    await patchPinMutation.mutateAsync(nextPinned)
    successMessage.value = nextPinned ? 'お知らせを固定表示しました。' : 'お知らせの固定表示を解除しました。'
  } catch (error) {
    errorMessage.value = extractStaffPageValidationMessage(error)
  }
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
            <StatusBadge :tone="pageQuery.data.value.isPublic ? 'success' : 'muted'" appearance="outlined">
              {{ pageQuery.data.value.isPublic ? '公開中' : '非公開' }}
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
            :field-errors="fieldErrors"
            :on-blur-field="markTouched"
          />
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
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

          <button
            class="rounded border border-border bg-surface px-6 py-3 font-bold text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="patchPinMutation.isPending.value"
            type="button"
            @click="handleTogglePin"
          >
            {{
              patchPinMutation.isPending.value
                ? '更新中...'
                : pageQuery.data.value.isPinned
                  ? '固定表示を解除'
                  : '固定表示'
            }}
          </button>
        </div>
      </SurfaceCard>
    </form>

    <AlertMessage v-else tone="danger"> お知らせを取得できませんでした。 </AlertMessage>
  </PageLayout>
</template>
