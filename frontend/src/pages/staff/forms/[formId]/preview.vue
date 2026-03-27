<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'forms.read'
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffFormPreviewQuery } from '@/features/staff/forms/api'
import { buildStaffFormTabs } from '@/features/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'

const route = useRoute('/staff/forms/[formId]/preview')
const sessionStore = useSessionStore()
const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const previewQuery = useStaffFormPreviewQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const staffFormTabs = computed(() => buildStaffFormTabs(formId.value, 'edit'))
const isLimitedPublic = computed(() => (previewQuery.data.value?.answerableTags.length ?? 0) > 0)
</script>

<template>
  <PageLayout>
    <BackLink :to="`/staff/forms/${formId}/edit`"> フォーム詳細へ戻る </BackLink>

    <TabStrip :tabs="staffFormTabs" />

    <div v-if="previewQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="previewQuery.data.value" class="space-y-6">
      <AlertMessage tone="danger">
        このフォームから実際に送信することはできません。質問内容や表示を確認するためのプレビューです。
      </AlertMessage>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>{{ previewQuery.data.value.name }}</template>
          <template #description>
            受付期間 : {{ previewQuery.data.value.openAt }}〜{{ previewQuery.data.value.closeAt }}<br />
            {{ previewQuery.data.value.maxAnswers }} 件まで回答可能
          </template>
        </SurfaceHeader>
        <div class="px-6 py-5">
          <p class="whitespace-pre-wrap text-sm leading-7 text-body">
            {{ previewQuery.data.value.description }}
          </p>
          <div
            v-if="isLimitedPublic"
            class="mt-4 rounded border border-primary/20 bg-primary-light px-4 py-3 text-sm text-body"
          >
            このフォームは
            <span class="font-semibold">{{ previewQuery.data.value.answerableTags.join(' / ') }}</span>
            のタグを持つ企画に限定公開されます。
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>プレビュー</template>
        </SurfaceHeader>
        <div class="grid gap-0">
          <template v-for="question in previewQuery.data.value.questions" :key="question.id">
            <div v-if="question.type === 'heading'" class="border-b border-border px-6 py-5">
              <h4 class="text-lg font-semibold text-body">{{ question.name }}</h4>
              <p v-if="question.description" class="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                {{ question.description }}
              </p>
            </div>

            <div v-else class="border-b border-border px-6 py-5">
              <p class="text-sm font-semibold text-body">
                {{ question.name }}
                <span v-if="question.isRequired" class="ml-2 text-xs font-semibold text-danger">必須</span>
              </p>
              <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                {{ question.description }}
              </p>

              <input
                v-if="question.type === 'text' || question.type === 'number'"
                class="mt-4 bg-form-control"
                :type="question.type === 'number' ? 'number' : 'text'"
                disabled
              />
              <textarea v-else-if="question.type === 'textarea'" class="mt-4 min-h-32 bg-form-control" disabled />
              <select v-else-if="question.type === 'select'" class="mt-4 bg-form-control" disabled>
                <option>選択してください</option>
                <option v-for="option in question.options" :key="option">{{ option }}</option>
              </select>
              <div v-else-if="question.type === 'radio' || question.type === 'checkbox'" class="mt-4 grid gap-2">
                <label
                  v-for="option in question.options"
                  :key="option"
                  class="flex items-center gap-3 text-sm text-body"
                >
                  <input :type="question.type" disabled />
                  {{ option }}
                </label>
              </div>
              <div
                v-else-if="question.type === 'upload'"
                class="mt-4 rounded border border-dashed border-border px-4 py-6 text-sm text-muted-2"
              >
                ファイル選択欄が表示されます。
              </div>
            </div>
          </template>
        </div>
      </SurfaceCard>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      プレビューを取得できませんでした。
    </div>
  </PageLayout>
</template>
