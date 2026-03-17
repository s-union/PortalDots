<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
  },
});

import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import { usePublicPagesQuery } from "@/features/public-home/api";

const pagesQuery = usePublicPagesQuery(true);
</script>

<template>
  <section class="mx-auto max-w-[1024px] px-6 py-4 max-[1000px]:px-4">
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
      お知らせはまだありません
    </div>

    <ListPanel v-else legacy overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="page in pagesQuery.data.value"
          :key="page.id"
          legacy
          :to="`/public/pages/${encodeURIComponent(page.id)}`"
        >
          <template #title>{{ page.title }}</template>
          <template #prefix>
            <span
              :class="
                page.isLimited
                  ? 'rounded-full border border-primary px-2.5 py-1 text-xs font-semibold text-primary'
                  : 'rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted'
              "
            >
              {{ page.isLimited ? "限定公開" : "全員に公開" }}
            </span>
          </template>
          <template #meta>{{ page.publishedAt }}</template>
          {{ page.summary }}
        </ListItemLink>
      </div>
    </ListPanel>
  </section>
</template>
