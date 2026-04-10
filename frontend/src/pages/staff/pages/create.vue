<script setup lang="ts">
definePage({
  path: '/staff/pages/create',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'pages.edit'
  }
})

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layouts/PageLayout.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import { useStaffDocumentsQuery } from '@/features/staff/documents/api'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import StaffPageEditorForm from '@/features/staff/pages/components/StaffPageEditorForm.vue'
import {
  extractStaffPageValidationMessage,
  useCreateStaffPageMutation,
  useStaffPageForm
} from '@/features/staff/pages/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'

const router = useRouter()
const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const tagsQuery = useStaffTagsQuery(enabled)
const documentsQuery = useStaffDocumentsQuery(enabled)
const createPageMutation = useCreateStaffPageMutation()
const form = useStaffPageForm()
const errorMessage = ref('')

const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))
const availableDocuments = computed(() => documentsQuery.data.value ?? [])

async function handleCreatePage() {
  errorMessage.value = ''

  try {
    const created = await createPageMutation.mutateAsync({
      title: form.value.title,
      body: form.value.body,
      notes: form.value.notes,
      isPinned: form.value.isPinned,
      isPublic: form.value.isPublic,
      viewableTags: form.value.viewableTags,
      documentIds: form.value.documentIds,
      sendEmails: form.value.sendEmails
    })
    await router.push(`/staff/pages/${created.id}`)
  } catch (error) {
    errorMessage.value = extractStaffPageValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <form class="space-y-6" @submit.prevent="handleCreatePage">
      <SurfaceCard>
        <div class="border-b border-border px-6 py-5">
          <h1 class="text-2xl font-semibold text-body">お知らせを新規作成</h1>
        </div>
        <div class="px-6 py-6">
          <StaffPageEditorForm
            v-model="form"
            :available-tags="availableTags"
            :available-documents="availableDocuments"
            :documents-loading="documentsQuery.isPending.value"
            :error-message="errorMessage"
            submit-label="作成"
            :submitting="createPageMutation.isPending.value"
          />
        </div>
      </SurfaceCard>
    </form>
  </PageLayout>
</template>
