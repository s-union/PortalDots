<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'forms.edit'
  }
})

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import { useManagedStaffCirclesQuery } from '@/features/staff/circles/api'
import { formatDateTimeLocalValue, parseDateTimeLocalValue } from '@/lib/format/datetime'
import {
  createDefaultStaffFormPayload,
  extractStaffFormValidationMessage,
  formatStaffFormTags,
  parseStaffFormTags,
  useCreateStaffFormMutation
} from '@/features/staff/forms/api'

const router = useRouter()
const createFormMutation = useCreateStaffFormMutation()
const form = ref(createDefaultStaffFormPayload())
const errorMessage = ref('')
const circlesQuery = useManagedStaffCirclesQuery(true)

const openAtInput = computed({
  get: () => formatDateTimeLocalValue(form.value.openAt),
  set: (value: string) => {
    form.value.openAt = parseDateTimeLocalValue(value, form.value.openAt)
  }
})

const closeAtInput = computed({
  get: () => formatDateTimeLocalValue(form.value.closeAt),
  set: (value: string) => {
    form.value.closeAt = parseDateTimeLocalValue(value, form.value.closeAt)
  }
})

const answerableTagsInput = computed({
  get: () => formatStaffFormTags(form.value.answerableTags),
  set: (value: string) => {
    form.value.answerableTags = parseStaffFormTags(value)
  }
})

async function handleCreateForm() {
  errorMessage.value = ''

  try {
    const created = await createFormMutation.mutateAsync({
      ...form.value,
      maxAnswers: Math.max(1, Number(form.value.maxAnswers) || 1)
    })
    await router.push(`/staff/forms/${encodeURIComponent(created.id)}/editor`)
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <PageHeader title="申請フォームを新規作成" />

    <SurfaceCard>
      <SurfaceHeader>
        <template #description>旧画面の導線に合わせて、新規作成は専用ページで行います。</template>
      </SurfaceHeader>

      <form class="grid gap-4 px-6 py-6" @submit.prevent="handleCreateForm">
        <label class="grid gap-2 text-sm text-body">
          <span>
            対象企画
            <StatusBadge tone="danger" size="sm" class="ml-2">必須</StatusBadge>
          </span>
          <select v-model="form.circleId" name="circleId">
            <option value="">企画を選択してください</option>
            <option v-for="circle in circlesQuery.data.value ?? []" :key="circle.id" :value="circle.id">
              {{ circle.name }}
            </option>
          </select>
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>
            フォーム名
            <StatusBadge tone="danger" size="sm" class="ml-2">必須</StatusBadge>
          </span>
          <input v-model="form.name" name="name" type="text" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>フォームの説明</span>
          <textarea v-model="form.description" class="min-h-32" name="description" />
        </label>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm text-body">
            <span>受付開始日時</span>
            <input v-model="openAtInput" name="openAt" type="datetime-local" />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span>受付終了日時</span>
            <input v-model="closeAtInput" name="closeAt" type="datetime-local" />
          </label>
        </div>

        <label class="grid gap-2 text-sm text-body">
          <span>最大回答数</span>
          <input v-model.number="form.maxAnswers" min="1" name="maxAnswers" type="number" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>回答可能タグ</span>
          <textarea v-model="answerableTagsInput" class="min-h-24" name="answerableTags" />
        </label>

        <label class="grid gap-2 text-sm text-body">
          <span>回答完了メッセージ</span>
          <textarea v-model="form.confirmationMessage" class="min-h-24" name="confirmationMessage" />
        </label>

        <label class="flex items-center gap-3 text-sm text-body">
          <input v-model="form.isPublic" name="isPublic" type="checkbox" />
          公開する
        </label>

        <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

        <div class="flex justify-end">
          <button
            class="rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="createFormMutation.isPending.value"
            type="submit"
          >
            {{ createFormMutation.isPending.value ? '作成中...' : '保存' }}
          </button>
        </div>
      </form>
    </SurfaceCard>
  </PageLayout>
</template>
