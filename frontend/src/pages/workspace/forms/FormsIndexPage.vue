<script setup lang="ts">
import { computed } from "vue";
import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import { useFormsQuery, type FormSummary } from "@/features/forms/api";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();
const formsQuery = useFormsQuery();
const openForms = computed(() => (formsQuery.data.value ?? []).filter((form) => form.isOpen));
const closedForms = computed(() => (formsQuery.data.value ?? []).filter((form) => !form.isOpen));

function formMeta(form: FormSummary) {
  const schedule = form.isOpen ? `${form.closeAt} まで受付` : `${form.openAt} から受付開始`;
  return form.maxAnswers > 1 ? `${schedule} / 1企画あたり ${form.maxAnswers} 件まで` : schedule;
}

function formHref(form: FormSummary) {
  return `/workspace/forms/${form.id}`;
}
</script>

<template>
  <section class="space-y-6">
    <nav class="flex overflow-x-auto border-b border-border">
      <button
        class="border-b-2 border-primary px-4 py-3 text-sm font-semibold whitespace-nowrap text-primary"
        type="button"
      >
        受付中
      </button>
      <button
        class="border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap text-muted"
        type="button"
      >
        受付終了
      </button>
      <button
        class="border-b-2 border-transparent px-4 py-3 text-sm whitespace-nowrap text-muted"
        type="button"
      >
        全て
      </button>
    </nav>

    <div
      v-if="formsQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <div
      v-else-if="(formsQuery.data.value?.length ?? 0) === 0"
      class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
    >
      <p class="text-base">このリストは空です</p>
    </div>

    <ListPanel
      v-else
      title="申請"
      :description="sessionStore.currentCircle?.name ?? '企画未選択'"
      overflow-hidden
    >
      <div class="divide-y divide-border">
        <ListItemLink v-for="form in formsQuery.data.value" :key="form.id" :to="formHref(form)">
          <template #title>{{ form.name }}</template>
          <template #prefix>
            <span
              class="rounded-full border px-2.5 py-1 text-xs font-semibold"
              :class="
                form.isPublic
                  ? 'border-border text-muted'
                  : 'border-primary text-primary'
              "
            >
              {{ form.isPublic ? "全員に公開" : "限定公開" }}
            </span>
          </template>
          <template #suffix>
            <span
              v-if="form.hasAnswer"
              class="rounded-full bg-success-light px-2.5 py-1 text-xs font-semibold text-success"
            >
              提出済
            </span>
            <span
              v-if="!form.isOpen"
              class="rounded-full bg-muted-light px-2.5 py-1 text-xs font-semibold text-muted"
            >
              受付終了
            </span>
          </template>
          <template #meta>
            {{ formMeta(form) }}
          </template>
          {{ form.description }}
        </ListItemLink>
      </div>

      <div
        v-if="closedForms.length > 0 || openForms.length > 0"
        class="border-t border-border px-6 py-4 text-xs text-muted"
      >
        受付中 {{ openForms.length }} 件 / 受付終了 {{ closedForms.length }} 件
      </div>
    </ListPanel>
  </section>
</template>
