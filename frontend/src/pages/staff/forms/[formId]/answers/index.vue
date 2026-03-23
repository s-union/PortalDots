<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: 'formAnswers.read'
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BackLink from '@/components/ui/BackLink.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildStaffFormAnswersExportUrl,
  buildStaffFormAnswerUploadsZipUrl,
  useStaffFormAnswersIndexQuery
} from '@/features/staff/forms/answers'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'

const route = useRoute('/staff/forms/[formId]/answers/')
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const answersQuery = useStaffFormAnswersIndexQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null)
)

const exportUrl = computed(() => buildStaffFormAnswersExportUrl(formId.value))
const uploadsZipUrl = computed(() => buildStaffFormAnswerUploadsZipUrl(formId.value))
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'answers'))
</script>

<template>
  <section class="space-y-6">
    <BackLink :to="`/staff/forms/${formId}`"> フォーム詳細へ戻る </BackLink>

    <TabStrip :tabs="staffFormTabs" />

    <div v-if="answersQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="answersQuery.data.value" class="space-y-6">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Form Answers</p>
        <SurfaceHeader>
          <template #title>{{ answersQuery.data.value.form.name }}</template>
          <template #description>
            回答数 {{ answersQuery.data.value.answers.length }} / 未回答企画
            {{ answersQuery.data.value.notAnsweredCircles.length }}
          </template>
          <template #actions>
            <div class="flex flex-wrap gap-3">
              <RouterLink
                :to="`/staff/forms/${formId}/answers/create`"
                class="rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                新規回答
              </RouterLink>
              <a
                :href="exportUrl"
                class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                CSV 出力
              </a>
              <RouterLink
                :to="`/staff/forms/${formId}/answers/uploads`"
                class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                添付管理
              </RouterLink>
              <RouterLink
                :to="`/staff/forms/${formId}/not_answered`"
                class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                未回答企画一覧
              </RouterLink>
            </div>
          </template>
        </SurfaceHeader>
      </SurfaceCard>

      <section class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div class="rounded border border-border bg-surface shadow-lv1">
          <div class="border-b border-border px-6 py-4">
            <h2 class="text-lg font-semibold text-body">回答一覧</h2>
          </div>

          <div v-if="answersQuery.data.value.answers.length === 0" class="px-6 py-5 text-sm text-muted-2">
            まだ回答はありません。
          </div>

          <ul v-else class="grid gap-0">
            <li
              v-for="answer in answersQuery.data.value.answers"
              :key="answer.id"
              class="border-b border-border px-6 py-5 last:border-b-0"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="space-y-2">
                  <p class="text-sm font-semibold text-body">{{ answer.circle.name }}</p>
                  <p class="text-xs text-muted-2">
                    {{ answer.circle.groupName }} / {{ answer.circle.participationTypeName }}
                  </p>
                  <p class="line-clamp-3 whitespace-pre-wrap text-sm text-muted">
                    {{ answer.body || '本文はまだありません。' }}
                  </p>
                  <p class="text-xs text-muted-2">
                    作成 {{ answer.createdAt }} / 最終更新 {{ answer.updatedAt }} / 添付 {{ answer.uploadCount }} 件
                  </p>
                </div>
                <RouterLink
                  :to="`/staff/forms/${formId}/answers/${answer.id}/edit`"
                  class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
                >
                  編集
                </RouterLink>
              </div>
            </li>
          </ul>
        </div>

        <aside class="rounded border border-border bg-surface shadow-lv1">
          <div class="border-b border-border px-6 py-4">
            <h2 class="text-lg font-semibold text-body">未回答企画</h2>
          </div>
          <ul v-if="answersQuery.data.value.notAnsweredCircles.length > 0" class="grid gap-0">
            <li
              v-for="circle in answersQuery.data.value.notAnsweredCircles"
              :key="circle.id"
              class="border-b border-border px-6 py-4 text-sm text-body last:border-b-0"
            >
              <p>{{ circle.name }}</p>
              <p class="mt-1 text-xs text-muted-2">{{ circle.groupName }} / {{ circle.participationTypeName }}</p>
            </li>
          </ul>
          <p v-else class="px-6 py-5 text-sm text-muted-2">未回答の企画はありません。</p>
          <div class="border-t border-border px-6 py-4">
            <div class="flex flex-wrap gap-3">
              <RouterLink
                :to="`/staff/forms/${formId}/not_answered`"
                class="inline-flex rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                専用画面で見る
              </RouterLink>
              <a
                :href="uploadsZipUrl"
                class="inline-flex rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              >
                ZIP を直接ダウンロード
              </a>
            </div>
          </div>
        </aside>
      </section>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      回答一覧を取得できませんでした。
    </div>
  </section>
</template>
