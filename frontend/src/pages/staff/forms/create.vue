<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/create',
  meta: staffPageMeta('forms.edit')
})

import { computed } from 'vue'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { SchemaFormFields, type FieldOverrides } from '@/features/forms/schema-form'
import { useStaffTagsQuery, staffTagColorMap } from '@/features/staff/masters/tags'
import { createDefaultStaffFormPayload } from '@/features/staff/forms/utils'
import { extractStaffFormValidationMessage, useCreateStaffFormMutation } from '@/features/staff/forms/queries'
import { staffFormSchema } from '@/lib/form-validation'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'

const router = useRouter()
const createFormMutation = useCreateStaffFormMutation()
const tagsQuery = useStaffTagsQuery(true)

// answerableTags' picker data comes from a query.
const overrides = computed<FieldOverrides<typeof staffFormSchema.entries>>(() => ({
  confirmationMessage: {
    label:
      'フォームに回答した方に向けて表示するメッセージを設定できます。この内容は、回答したユーザーに自動で送信されるメールにも表示されます。',
    helper: ''
  },
  answerableTags: {
    availableTags: (tagsQuery.data.value ?? []).map((tag) => tag.name),
    tagColors: staffTagColorMap(tagsQuery.data.value ?? [])
  }
}))

const {
  form,
  errorMessage,
  submitEvent: handleCreateForm
} = useSubmitForm({
  schema: staffFormSchema,
  initialInput: createDefaultStaffFormPayload(),
  errorMessage: extractStaffFormValidationMessage,
  submit: async (input) => {
    const created = await createFormMutation.mutateAsync(input)
    await router.replace(`/staff/forms/${encodeURIComponent(created.id)}/editor`)
  }
})
</script>

<template>
  <PageLayout>
    <SurfaceCard>
      <SurfaceCardBand>
        <RouterLink to="/staff/forms" class="text-sm text-primary hover:underline">申請管理</RouterLink>
      </SurfaceCardBand>

      <form class="grid gap-6 px-6 py-6" novalidate :aria-busy="form.isSubmitting" @submit="handleCreateForm">
        <header class="space-y-2">
          <h1 class="text-2xl font-semibold text-body">フォームを新規作成</h1>
        </header>

        <SchemaFormFields :of="form" :schema="staffFormSchema" :overrides="overrides" />

        <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

        <ActionsFooter align="center">
          <BaseButton variant="primary" size="wide" weight="bold" type="submit" :disabled="form.isSubmitting">
            {{ form.isSubmitting ? '作成中...' : '保存' }}
          </BaseButton>
        </ActionsFooter>
      </form>
    </SurfaceCard>
  </PageLayout>
</template>
