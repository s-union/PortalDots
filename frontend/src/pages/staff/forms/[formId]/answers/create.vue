<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'formAnswers.edit'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDateTime } from '@/lib/format/datetime'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  extractExistingAnswerId,
  extractStaffFormAnswerValidationMessage,
  staffAnswerDraftToPayload,
  useCreateStaffFormAnswerMutation,
  useStaffFormAnswersIndexQuery
} from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'

const route = useRoute('/staff/forms/[formId]/answers/create')
const router = useRouter()
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const selectedCircleId = ref('')
const errorMessage = ref('')

const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const answersQuery = useStaffFormAnswersIndexQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const createAnswerMutation = useCreateStaffFormAnswerMutation(formId)

watch(
  () => route.query.circle,
  (value) => {
    selectedCircleId.value = typeof value === 'string' ? value : ''
  },
  { immediate: true }
)

const selectedCircle = computed(
  () => answersQuery.data.value?.circles.find((circle) => circle.id === selectedCircleId.value) ?? null
)
const selectedCircleAnswers = computed(
  () => answersQuery.data.value?.answers.filter((answer) => answer.circle.id === selectedCircleId.value) ?? []
)
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'answers'))
const notificationMessage = computed(() => {
  const form = answersQuery.data.value?.form
  if (!form) {
    return ''
  }
  if (form.isPublic && !form.isParticipationForm) {
    return 'この回答を保存すると、対象企画のメンバーへ回答更新通知メールが送信されます。'
  }
  return 'このフォームでは、スタッフが回答を保存しても企画メンバーへの通知メールは送信されません。'
})

async function handleCreateAnswer() {
  errorMessage.value = ''
  if (selectedCircleId.value.length === 0) {
    errorMessage.value = '対象企画を選択してください。'
    return
  }

  try {
    const created = await createAnswerMutation.mutateAsync(staffAnswerDraftToPayload(selectedCircleId.value, '', {}))
    await router.push(`/staff/forms/${encodeURIComponent(formId.value)}/answers/${encodeURIComponent(created.id)}/edit`)
  } catch (error) {
    const existingAnswerId = extractExistingAnswerId(error)
    if (existingAnswerId) {
      await router.push(
        `/staff/forms/${encodeURIComponent(formId.value)}/answers/${encodeURIComponent(existingAnswerId)}/edit`
      )
      return
    }
    errorMessage.value = extractStaffFormAnswerValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <TabStrip :tabs="staffFormTabs" />

    <div v-if="answersQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Create Answer</p>
        <SurfaceHeader>
          <template #title>{{ answersQuery.data.value.form.name }}</template>
          <template #description> 回答対象の企画を選んで新規回答を作成します。 </template>
        </SurfaceHeader>
      </SurfaceCard>

      <section class="rounded border border-border bg-surface p-6 shadow-lv1">
        <div class="grid gap-4">
          <div class="rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted">
            {{ notificationMessage }}
          </div>

          <label class="grid gap-2 text-sm text-body">
            <span>回答を作成する企画</span>
            <select
              v-model="selectedCircleId"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
            >
              <option value="">企画を選択してください</option>
              <option v-for="circle in answersQuery.data.value.circles" :key="circle.id" :value="circle.id">
                {{ circle.name }} / {{ circle.groupName }} / {{ circle.participationTypeName }}
              </option>
            </select>
          </label>

          <div v-if="selectedCircle" class="rounded border border-border bg-surface-light px-4 py-4 text-sm text-muted">
            <p class="font-semibold text-body">{{ selectedCircle.name }}</p>
            <p class="mt-1">{{ selectedCircle.groupName }} / {{ selectedCircle.participationTypeName }}</p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="createAnswerMutation.isPending.value"
              type="button"
              @click="handleCreateAnswer"
            >
              {{ createAnswerMutation.isPending.value ? '作成中...' : '新規回答を作成' }}
            </button>
          </div>
        </div>

        <p v-if="errorMessage" class="mt-4 text-sm text-danger">{{ errorMessage }}</p>
      </section>

      <section v-if="selectedCircleId.length > 0" class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h2 class="text-lg font-semibold text-body">以前の回答を閲覧・変更</h2>
        </div>

        <div v-if="selectedCircleAnswers.length === 0" class="px-6 py-5 text-sm text-muted-2">
          この企画の回答はまだありません。
        </div>

        <ul v-else class="grid gap-0">
          <li
            v-for="answer in selectedCircleAnswers"
            :key="answer.id"
            class="border-b border-border px-6 py-5 last:border-b-0"
          >
            <RouterLink :to="`/staff/forms/${formId}/answers/${answer.id}/edit`" class="grid gap-2 text-sm text-body">
              <span class="font-semibold">作成 {{ formatDateTime(answer.createdAt) }} / 回答ID : {{ answer.id }}</span>
              <span class="text-muted-2">最終更新 {{ formatDateTime(answer.updatedAt) }}</span>
              <span class="line-clamp-2 whitespace-pre-wrap text-muted">
                {{ answer.body || '本文はまだありません。' }}
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      回答作成画面を表示できませんでした。
    </div>
  </PageLayout>
</template>
