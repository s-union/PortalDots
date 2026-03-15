<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import { useSessionStore } from "@/features/session/store";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import { useStaffFormPreviewQuery } from "@/features/staff/forms/api";

const route = useRoute();
const sessionStore = useSessionStore();
const formId = computed(() => String(route.params.formId ?? ""));
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const previewQuery = useStaffFormPreviewQuery(
  formId,
  computed(
    () => staffStatusQuery.data.value?.authorized === true && sessionStore.currentCircle !== null,
  ),
);
</script>

<template>
  <section class="space-y-6">
    <BackLink :to="`/staff/forms/${formId}`"> フォーム詳細へ戻る </BackLink>

    <div
      v-if="previewQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <article v-else-if="previewQuery.data.value" class="space-y-6">
      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-5">
          <h2 class="text-2xl font-semibold text-body">{{ previewQuery.data.value.name }}</h2>
          <div class="mt-3 space-y-1 text-sm text-muted">
            <p>
              受付期間 : {{ previewQuery.data.value.openAt }}〜{{ previewQuery.data.value.closeAt }}
            </p>
            <p>{{ previewQuery.data.value.maxAnswers }} 件まで回答可能</p>
          </div>
        </div>
        <div class="px-6 py-5">
          <p class="whitespace-pre-wrap text-sm leading-7 text-body">
            {{ previewQuery.data.value.description }}
          </p>
        </div>
      </section>

      <section class="rounded border border-border bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-4">
          <h3 class="text-base font-semibold text-body">プレビュー</h3>
        </div>
        <div class="grid gap-0">
          <template v-for="question in previewQuery.data.value.questions" :key="question.id">
            <div v-if="question.type === 'heading'" class="border-b border-border px-6 py-5">
              <h4 class="text-lg font-semibold text-body">{{ question.name }}</h4>
              <p
                v-if="question.description"
                class="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted"
              >
                {{ question.description }}
              </p>
            </div>

            <div v-else class="border-b border-border px-6 py-5">
              <p class="text-sm font-semibold text-body">
                {{ question.name }}
                <span v-if="question.isRequired" class="ml-2 text-xs font-semibold text-danger"
                  >必須</span
                >
              </p>
              <p
                v-if="question.description"
                class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted"
              >
                {{ question.description }}
              </p>

              <input
                v-if="question.type === 'text' || question.type === 'number'"
                class="mt-4 bg-form-control"
                :type="question.type === 'number' ? 'number' : 'text'"
                disabled
              />
              <textarea
                v-else-if="question.type === 'textarea'"
                class="mt-4 min-h-32 bg-form-control"
                disabled
              />
              <select v-else-if="question.type === 'select'" class="mt-4 bg-form-control" disabled>
                <option>選択してください</option>
                <option v-for="option in question.options" :key="option">{{ option }}</option>
              </select>
              <div
                v-else-if="question.type === 'radio' || question.type === 'checkbox'"
                class="mt-4 grid gap-2"
              >
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
      </section>
    </article>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      プレビューを取得できませんでした。
    </div>
  </section>
</template>
