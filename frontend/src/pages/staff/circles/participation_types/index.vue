<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/circles/participation_types',
  meta: staffPageMeta('circles.participationTypes')
})

import { computed } from 'vue'
import { reset } from '@formisch/vue'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
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
import FormischField from '@/components/forms/FormischField.vue'
import DateTimeInput from '@/components/forms/DateTimeInput.vue'
import CheckboxField from '@/components/ui/CheckboxField.vue'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const participationTypesQuery = useStaffParticipationTypesQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const tagsQuery = useStaffTagsQuery(computed(() => staffStatusQuery.data.value?.authorized === true))
const createMutation = useCreateStaffParticipationTypeMutation()
const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))
const tagColors = computed(() => staffTagColorMap(tagsQuery.data.value ?? []))

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
        <FormischField v-slot="{ field, control }" :of="form" :path="['name']" label="参加種別名">
          <input v-bind="control" v-model="field.input" name="name" type="text" />
        </FormischField>
        <FormischField v-slot="{ field, control }" :of="form" :path="['description']" label="説明">
          <textarea v-bind="control" v-model="field.input" class="min-h-24" name="description" />
        </FormischField>
        <div class="grid gap-4 md:grid-cols-2">
          <FormischField v-slot="{ field, control }" :of="form" :path="['usersCountMin']" label="最低人数">
            <input v-bind="control" v-model.number="field.input" min="1" name="usersCountMin" type="number" />
          </FormischField>
          <FormischField v-slot="{ field, control }" :of="form" :path="['usersCountMax']" label="最大人数">
            <input v-bind="control" v-model.number="field.input" min="1" name="usersCountMax" type="number" />
          </FormischField>
        </div>
        <FormischField v-slot="{ field, control }" :of="form" :path="['tags']" label="付与タグ">
          <StaffTagPicker
            :control="control"
            :model-value="field.input ?? []"
            @update:model-value="field.input = $event"
            :available-tags="availableTags"
            :tag-colors="tagColors"
            name="tags"
          />
        </FormischField>
        <div class="grid gap-4 md:grid-cols-2">
          <FormischField v-slot="{ field, control }" :of="form" :path="['openAt']" label="受付開始日時">
            <DateTimeInput :control="control" v-model="field.input" />
          </FormischField>
          <FormischField v-slot="{ field, control }" :of="form" :path="['closeAt']" label="受付終了日時">
            <DateTimeInput :control="control" v-model="field.input" />
          </FormischField>
        </div>
        <FormischField
          v-slot="{ field, control }"
          :of="form"
          :path="['formDescription']"
          label="参加登録前に表示する内容"
        >
          <MarkdownEditorField
            :control="control"
            :model-value="field.input ?? ''"
            @update:model-value="field.input = $event"
            min-height-class="min-h-24"
            name="formDescription"
          />
        </FormischField>
        <FormischField
          v-slot="{ field, control }"
          :of="form"
          :path="['formConfirmationMessage']"
          label="提出後メッセージ"
        >
          <MarkdownEditorField
            :control="control"
            :model-value="field.input ?? ''"
            @update:model-value="field.input = $event"
            min-height-class="min-h-24"
            name="formConfirmationMessage"
          />
        </FormischField>
        <FormischField v-slot="{ field, control }" :of="form" :path="['isPublic']" label="公開設定" as="fieldset"
          ><CheckboxField
            :control="control"
            :model-value="field.input ?? false"
            @update:model-value="field.input = $event"
            label="参加登録画面を公開する"
            name="isPublic"
        /></FormischField>
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
