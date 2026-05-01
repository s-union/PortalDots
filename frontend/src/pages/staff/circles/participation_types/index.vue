<script setup lang="ts">
definePage({
  path: '/staff/circles/participation_types',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.participationTypes'
  }
})

import { computed, ref } from 'vue'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { formatDateTimeLocalValue, parseDateTimeLocalValue } from '@/lib/format/datetime'
import {
  extractStaffParticipationTypeValidationMessage,
  useCreateStaffParticipationTypeMutation,
  useStaffParticipationTypeForm,
  useStaffParticipationTypesQuery
} from '@/features/staff/participation-types/api'
import { useSessionStore } from '@/features/session/store'
import { useFormValidation, staffParticipationTypeFormSchema } from '@/lib/form-validation'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const participationTypesQuery = useStaffParticipationTypesQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const tagsQuery = useStaffTagsQuery(computed(() => staffStatusQuery.data.value?.authorized === true))
const createMutation = useCreateStaffParticipationTypeMutation()
const form = useStaffParticipationTypeForm()
const errorMessage = ref('')
const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: staffParticipationTypeFormSchema,
  form
})

function handleOpenAtInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  form.value.openAt = parseDateTimeLocalValue(target.value)
  markTouched('openAt')
}

function handleCloseAtInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  form.value.closeAt = parseDateTimeLocalValue(target.value)
  markTouched('closeAt')
}

async function handleCreate() {
  errorMessage.value = ''

  if (!validateAll()) {
    return
  }

  try {
    await createMutation.mutateAsync({
      ...form.value,
      openAt: parseDateTimeLocalValue(form.value.openAt),
      closeAt: parseDateTimeLocalValue(form.value.closeAt)
    })
    form.value = useStaffParticipationTypeForm().value
  } catch (error) {
    errorMessage.value = extractStaffParticipationTypeValidationMessage(error)
  }
}
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

    <form class="rounded border border-border bg-surface p-6 shadow-lv1" @submit.prevent="handleCreate">
      <h2 class="text-lg font-semibold text-body">参加種別を新規作成</h2>
      <div class="mt-4 grid gap-4">
        <label class="grid gap-2 text-sm text-body">
          <span>参加種別名</span>
          <input
            v-model="form.name"
            name="name"
            type="text"
            :class="{ 'border-danger': getFieldError('name') }"
            @blur="markTouched('name')"
            @input="markTouched('name')"
          />
          <p v-if="getFieldError('name')" class="text-xs text-danger">{{ getFieldError('name') }}</p>
        </label>
        <label class="grid gap-2 text-sm text-body">
          <span>説明</span>
          <textarea v-model="form.description" class="min-h-24" name="description" />
        </label>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm text-body">
            <span>最低人数</span>
            <input
              v-model.number="form.usersCountMin"
              min="1"
              name="usersCountMin"
              type="number"
              :class="{ 'border-danger': getFieldError('usersCountMin') }"
              @blur="markTouched('usersCountMin')"
              @input="markTouched('usersCountMin')"
            />
            <p v-if="getFieldError('usersCountMin')" class="text-xs text-danger">
              {{ getFieldError('usersCountMin') }}
            </p>
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span>最大人数</span>
            <input
              v-model.number="form.usersCountMax"
              min="1"
              name="usersCountMax"
              type="number"
              :class="{ 'border-danger': getFieldError('usersCountMax') }"
              @blur="markTouched('usersCountMax')"
              @input="markTouched('usersCountMax')"
            />
            <p v-if="getFieldError('usersCountMax')" class="text-xs text-danger">
              {{ getFieldError('usersCountMax') }}
            </p>
          </label>
        </div>
        <label class="grid gap-2 text-sm text-body">
          <span>付与タグ</span>
          <StaffTagPicker v-model="form.tags" :available-tags="availableTags" name="tags" />
        </label>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm text-body">
            <span>受付開始日時</span>
            <input
              :value="formatDateTimeLocalValue(form.openAt)"
              name="openAt"
              type="datetime-local"
              :class="{ 'border-danger': getFieldError('openAt') }"
              @input="handleOpenAtInput"
              @blur="markTouched('openAt')"
            />
            <p v-if="getFieldError('openAt')" class="text-xs text-danger">{{ getFieldError('openAt') }}</p>
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span>受付終了日時</span>
            <input
              :value="formatDateTimeLocalValue(form.closeAt)"
              name="closeAt"
              type="datetime-local"
              :class="{ 'border-danger': getFieldError('closeAt') }"
              @input="handleCloseAtInput"
              @blur="markTouched('closeAt')"
            />
            <p v-if="getFieldError('closeAt')" class="text-xs text-danger">{{ getFieldError('closeAt') }}</p>
          </label>
        </div>
        <label class="grid gap-2 text-sm text-body">
          <span>参加登録前に表示する内容</span>
          <MarkdownEditorField v-model="form.formDescription" min-height-class="min-h-24" name="formDescription" />
        </label>
        <label class="grid gap-2 text-sm text-body">
          <span>提出後メッセージ</span>
          <MarkdownEditorField
            v-model="form.formConfirmationMessage"
            min-height-class="min-h-24"
            name="formConfirmationMessage"
          />
        </label>
        <label class="flex items-center gap-3 text-sm text-body">
          <input v-model="form.isPublic" name="isPublic" type="checkbox" />
          参加登録画面を公開する
        </label>
        <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
      </div>
      <div class="mt-5">
        <button
          class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
          :disabled="createMutation.isPending.value"
          type="submit"
        >
          {{ createMutation.isPending.value ? '作成中...' : '保存' }}
        </button>
      </div>
    </form>
  </PageLayout>
</template>
