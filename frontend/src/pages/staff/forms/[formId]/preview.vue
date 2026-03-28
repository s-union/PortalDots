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
import { formatDateTime } from '@/lib/format/datetime'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffFormPreviewQuery } from '@/features/staff/forms/api'

const route = useRoute('/staff/forms/[formId]/preview')
const sessionStore = useSessionStore()

const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const previewQuery = useStaffFormPreviewQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const isLimitedPublic = computed(() => (previewQuery.data.value?.answerableTags.length ?? 0) > 0)
</script>

<template>
  <section class="pb-6">
    <div v-if="previewQuery.isPending.value" class="mt-6 px-6 max-[1000px]:px-4">
      <div class="rounded border border-border bg-surface px-6 py-5 text-muted shadow-lv1">読み込み中...</div>
    </div>

    <template v-else-if="previewQuery.data.value">
      <div class="mt-6 bg-primary px-6 py-4 text-white shadow-lv1 max-[1000px]:px-4">
        <div class="mx-auto w-full max-w-[960px]">
          <p class="text-lg font-semibold">プレビュー</p>
          <p class="mt-1 text-sm text-white/90">このフォームから実際に送信することはできません。</p>
        </div>
      </div>

      <article class="mx-auto w-full max-w-[960px] space-y-6 px-6 py-6 max-[1000px]:px-4">
        <header class="space-y-4">
          <div>
            <h1 class="text-3xl font-semibold text-body">{{ previewQuery.data.value.name }}</h1>
            <p class="mt-3 text-sm text-muted">
              受付期間 : {{ formatDateTime(previewQuery.data.value.openAt) }}〜{{
                formatDateTime(previewQuery.data.value.closeAt)
              }}
            </p>
            <p v-if="!previewQuery.data.value.isOpen" class="mt-1 text-sm font-semibold text-danger">受付期間外です</p>
          </div>

          <p v-if="previewQuery.data.value.description" class="whitespace-pre-wrap text-sm leading-7 text-body">
            {{ previewQuery.data.value.description }}
          </p>

          <div
            v-if="isLimitedPublic"
            class="rounded border border-primary/20 bg-primary-light px-4 py-3 text-sm text-body"
          >
            <span
              class="mr-2 inline-flex rounded border border-primary/20 px-2 py-0.5 text-xs font-semibold text-primary"
            >
              限定公開
            </span>
            このフォームは、{{ previewQuery.data.value.answerableTags.join(' / ') }}
            のタグを持つ企画に限定公開されます。
          </div>
        </header>

        <div class="overflow-hidden rounded border border-border bg-surface shadow-lv1">
          <template v-for="question in previewQuery.data.value.questions" :key="question.id">
            <div v-if="question.type === 'heading'" class="border-b border-border px-6 py-5 last:border-b-0">
              <h2 class="text-lg font-semibold text-body">{{ question.name }}</h2>
              <p v-if="question.description" class="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                {{ question.description }}
              </p>
            </div>

            <div v-else class="border-b border-border px-6 py-5 last:border-b-0">
              <div class="grid gap-3">
                <div>
                  <p class="text-sm font-semibold text-body">
                    {{ question.name }}
                    <span v-if="question.isRequired" class="ml-2 text-xs font-semibold text-danger">必須</span>
                  </p>
                  <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {{ question.description }}
                  </p>
                </div>

                <input
                  v-if="question.type === 'text'"
                  class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
                  type="text"
                  disabled
                  placeholder="一行入力"
                />
                <textarea
                  v-else-if="question.type === 'textarea'"
                  class="min-h-32 rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
                  disabled
                  placeholder="複数行入力"
                />
                <input
                  v-else-if="question.type === 'number'"
                  class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
                  type="number"
                  disabled
                  placeholder="整数入力"
                />
                <select
                  v-else-if="question.type === 'select'"
                  class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
                  disabled
                >
                  <option>選択してください</option>
                  <option v-for="option in question.options" :key="option">{{ option }}</option>
                </select>
                <div v-else-if="question.type === 'radio'" class="grid gap-2">
                  <label
                    v-for="option in question.options"
                    :key="option"
                    class="flex items-center gap-3 text-sm text-body"
                  >
                    <input type="radio" disabled />
                    <span>{{ option }}</span>
                  </label>
                </div>
                <div v-else-if="question.type === 'checkbox'" class="grid gap-2">
                  <label
                    v-for="option in question.options"
                    :key="option"
                    class="flex items-center gap-3 text-sm text-body"
                  >
                    <input type="checkbox" disabled />
                    <span>{{ option }}</span>
                  </label>
                </div>
                <div
                  v-else-if="question.type === 'upload'"
                  class="rounded border border-dashed border-border bg-form-control px-4 py-6 text-sm text-muted"
                >
                  ファイル選択欄が表示されます。
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="flex justify-center">
          <button class="rounded bg-primary px-8 py-3 font-bold text-white opacity-70" disabled type="button">
            送信
          </button>
        </div>
      </article>
    </template>

    <div v-else class="mt-6 px-6 max-[1000px]:px-4">
      <div class="rounded border border-danger bg-danger-light px-6 py-5 text-danger">
        プレビューを取得できませんでした。
      </div>
    </div>
  </section>
</template>
