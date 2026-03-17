<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true,
  },
});

import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const routeParams = computed(() => route.params as Record<string, string | string[] | undefined>);
const verifyType = computed(() => {
  const value = routeParams.value.type;
  return typeof value === "string" ? value : "unknown";
});
const userId = computed(() => {
  const value = routeParams.value.userId;
  return typeof value === "string" ? value : "unknown";
});

const verifyNotes = computed(() => [
  `認証種別: ${verifyType.value}`,
  `対象ユーザー: ${userId.value}`,
]);
</script>

<template>
  <section class="mx-auto w-full max-w-[880px] space-y-6 px-6 py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">メール認証</h1>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>署名付きメール認証リンクの旧フローは未移植です。</p>
        <ul class="list-disc space-y-1 pl-6 text-muted">
          <li v-for="note in verifyNotes" :key="note">{{ note }}</li>
        </ul>
      </div>
    </section>
    <div class="pt-2 text-center">
      <RouterLink
        class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
        to="/"
      >
        ホームへ戻る
      </RouterLink>
    </div>
  </section>
</template>
