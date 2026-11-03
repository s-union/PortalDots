<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/circles/participation_types',
  meta: staffPageMeta('circles.participationTypes')
})

import { computed } from 'vue'
import { reset } from '@formisch/vue'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import { SchemaFormFields, type FieldOverrides } from '@/features/forms/schema-form'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffTagsQuery, staffTagColorMap } from '@/features/staff/masters/tags'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  extractStaffParticipationTypeValidationMessage,
  useCreateStaffParticipationTypeMutation,
  staffParticipationTypeInput,
  useStaffParticipationTypesQuery
} from '@/features/staff/participation-types/api'
import { useSessionStore } from '@/features/session/store'
import { staffParticipationTypeFormSchema } from '@/lib/form-validation'
import BaseButton from '@/components/ui/BaseButton.vue'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const participationTypesQuery = useStaffParticipationTypesQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const tagsQuery = useStaffTagsQuery(computed(() => staffStatusQuery.data.value?.authorized === true))
const createMutation = useCreateStaffParticipationTypeMutation()

// `tags`'s picker data (available tags and their colors) comes from a query.
const overrides = computed<FieldOverrides<typeof staffParticipationTypeFormSchema.entries>>(() => ({
  isPublic: { hideLabel: true },
  tags: {
    availableTags: (tagsQuery.data.value ?? []).map((tag) => tag.name),
    tagColors: staffTagColorMap(tagsQuery.data.value ?? [])
  }
}))

const {
  form,
  errorMessage,
  submitEvent: handleCreate
} = useSubmitForm({
  schema: staffParticipationTypeFormSchema,
  initialInput: staffParticipationTypeInput(),
  errorMessage: extractStaffParticipationTypeValidationMessage,
  submit: async (input) => {
    await createMutation.mutateAsync(input)
    reset(form, { initialInput: staffParticipationTypeInput() })
  }
})
</script>

<template>
  <PageLayout>
    <p class="text-sm font-semibold text-body">参加種別管理</p>

    <SurfaceCard>
      <SurfaceHeader>
        <template #title>参加種別一覧</template>
      </SurfaceHeader>
      <div v-if="participationTypesQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>
      <div v-else-if="(participationTypesQuery.data.value?.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
        参加種別はまだありません。
      </div>
      <div v-else class="divide-y divide-border">
        <RouterLink
          v-for="participationType in participationTypesQuery.data.value"
          :key="participationType.id"
          :to="`/staff/circles/participation_types/${participationType.id}`"
          class="block px-6 py-5 transition hover:bg-surface-light"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-medium text-body">{{ participationType.name }}</h3>
              <p class="mt-1 text-sm text-muted">{{ participationType.description }}</p>
            </div>
            <StatusBadge tone="primary">
              {{ participationType.usersCountMin }} - {{ participationType.usersCountMax }} 人
            </StatusBadge>
          </div>
        </RouterLink>
      </div>
    </SurfaceCard>

    <form
      class="rounded border border-border bg-surface p-6 shadow-lv1"
      novalidate
      :aria-busy="form.isSubmitting"
      @submit="handleCreate"
    >
      <h2 class="text-lg font-semibold text-body">参加種別を新規作成</h2>
      <div class="mt-4 grid gap-4">
        <SchemaFormFields
          required-label=""
          :of="form"
          :schema="staffParticipationTypeFormSchema"
          :overrides="overrides"
        />
        <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
      </div>
      <div class="mt-5">
        <BaseButton variant="primary" size="wide" weight="bold" type="submit" :disabled="form.isSubmitting">
          {{ form.isSubmitting ? '作成中...' : '保存' }}
        </BaseButton>
      </div>
    </form>
  </PageLayout>
</template>
