<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/pages/create',
  meta: staffPageMeta('pages.edit')
})

import { computed } from 'vue'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layouts/PageLayout.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import { useStaffDocumentsQuery } from '@/features/staff/documents/api'
import { useStaffTagsQuery, staffTagColorMap } from '@/features/staff/masters/tags'
import StaffPageEditorForm from '@/features/staff/pages/components/StaffPageEditorForm.vue'
import {
  extractStaffPageValidationMessage,
  useCreateStaffPageMutation,
  staffPageInput
} from '@/features/staff/pages/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { staffPageFormSchema } from '@/lib/form-validation'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const tagsQuery = useStaffTagsQuery(enabled)
const documentsQuery = useStaffDocumentsQuery(enabled)
const createPageMutation = useCreateStaffPageMutation()

const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))
const tagColors = computed(() => staffTagColorMap(tagsQuery.data.value ?? []))
const availableDocuments = computed(() => documentsQuery.data.value ?? [])

const {
  form,
  errorMessage,
  submitEvent: handleCreatePage
} = useSubmitForm({
  schema: staffPageFormSchema,
  initialInput: staffPageInput(),
  errorMessage: extractStaffPageValidationMessage,
  submit: async (input) => {
    const created = await createPageMutation.mutateAsync(input)
    await router.replace(`/staff/pages/${encodeURIComponent(created.id)}`)
  }
})
</script>

<template>
  <PageLayout>
    <form class="space-y-6" novalidate :aria-busy="form.isSubmitting" @submit="handleCreatePage">
      <SurfaceCard>
        <SurfaceCardBand>
          <h1 class="text-2xl font-semibold text-body">お知らせを新規作成</h1>
        </SurfaceCardBand>
        <div class="px-6 py-6">
          <StaffPageEditorForm
            :form="form"
            :available-tags="availableTags"
            :tag-colors="tagColors"
            :available-documents="availableDocuments"
            :documents-loading="documentsQuery.isPending.value"
            :error-message="errorMessage"
            submit-label="作成"
          />
        </div>
      </SurfaceCard>
    </form>
  </PageLayout>
</template>
