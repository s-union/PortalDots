<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/:formId/editor',
  meta: staffPageMeta('forms.edit')
})

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StaffFormEditorContent from '@/features/staff/forms/components/StaffFormEditorContent.vue'

const route = useRoute('/staff/forms/[formId]/editor')
const router = useRouter()
const formId = computed(() => String(route.params.formId ?? ''))

function handleNavigateToSettings() {
  router.push(`/staff/forms/${encodeURIComponent(formId.value)}/edit`)
}
</script>

<template>
  <StaffFormEditorContent :form-id="formId" @navigate-to-settings="handleNavigateToSettings" />
</template>
