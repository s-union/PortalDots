<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true,
  },
});

import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import { usePagesQuery } from "@/features/pages/api";
import { useSessionStore } from "@/features/session/store";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const searchQuery = ref(String(route.query.query ?? ""));
const pagesQuery = usePagesQuery(searchQuery);

watch(
  () => route.query.query,
  (value) => {
    searchQuery.value = String(value ?? "");
  },
);

async function handleSearchSubmit() {
  const normalizedQuery = searchQuery.value.trim();
  await router.replace({
    query: normalizedQuery === "" ? {} : { query: normalizedQuery },
  });
}

async function handleSearchReset() {
  searchQuery.value = "";
  await router.replace({ query: {} });
}
</script>

<template>
  <section class="space-y-6">
    <div class="rounded border border-border bg-surface p-6 shadow-lv1">
      <h2 class="text-xl font-semibold text-body">お知らせ</h2>
      <p class="mt-2 text-sm text-muted">
        {{ sessionStore.currentCircle?.name ?? "企画未選択" }}
      </p>

      <form class="mt-4 flex flex-wrap gap-3" @submit.prevent="handleSearchSubmit">
        <input
          v-model="searchQuery"
          class="min-w-64 flex-1"
          name="query"
          placeholder="お知らせを検索…"
          type="search"
        />
        <button
          class="rounded bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
          type="submit"
        >
          検索
        </button>
      </form>

      <div v-if="String(route.query.query ?? '') !== ''" class="mt-3">
        <button class="text-sm font-semibold text-muted" type="button" @click="handleSearchReset">
          検索をリセット
        </button>
      </div>
    </div>

    <div
      v-if="pagesQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <div
      v-else-if="(pagesQuery.data.value?.length ?? 0) === 0"
      class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
    >
      <p class="text-base">
        {{
          String(route.query.query ?? "") === ""
            ? "お知らせはまだありません"
            : "検索結果が見つかりませんでした"
        }}
      </p>
      <p v-if="String(route.query.query ?? '') !== ''" class="mt-3 text-sm">
        入力するキーワードを変えて、再度検索をお試しください。
      </p>
    </div>

    <ListPanel v-else overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="page in pagesQuery.data.value"
          :key="page.id"
          :to="`/workspace/pages/${page.id}`"
        >
          <template #title>{{ page.title }}</template>
          <template #prefix>
            <span
              class="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted"
            >
              全員に公開
            </span>
          </template>
          <template #meta>{{ page.publishedAt }}</template>
        </ListItemLink>
      </div>
    </ListPanel>
  </section>
</template>
