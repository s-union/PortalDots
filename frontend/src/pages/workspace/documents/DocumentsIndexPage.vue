<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import { buildApiUrl } from "@/lib/api/client";
import { formatFileSize } from "@/lib/format/fileSize";
import { calculateTotalPages } from "@/lib/pagination";
import { useDocumentsPageQuery } from "@/features/documents/api";
import { useSessionStore } from "@/features/session/store";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const pageSize = 10;
const currentPage = computed(() => {
  const raw = Number(route.query.page ?? 1);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
});
const documentsQuery = useDocumentsPageQuery(
  computed(() => ({
    page: currentPage.value,
    pageSize,
  })),
);
const totalPages = computed(() =>
  calculateTotalPages(documentsQuery.data.value?.total ?? 0, documentsQuery.data.value?.pageSize ?? pageSize),
);

watch(
  () => documentsQuery.data.value?.page,
  async (resolvedPage) => {
    if (!resolvedPage || resolvedPage === currentPage.value) {
      return;
    }

    await router.replace({
      query: resolvedPage <= 1 ? {} : { page: String(resolvedPage) },
    });
  },
);

async function movePage(nextPage: number) {
  const normalized = Math.min(Math.max(nextPage, 1), totalPages.value);
  await router.replace({
    query: normalized <= 1 ? {} : { page: String(normalized) },
  });
}
</script>

<template>
  <section class="space-y-6">
    <div
      v-if="documentsQuery.isPending.value"
      class="rounded border border-border bg-surface p-6 text-muted shadow-lv1"
    >
      読み込み中...
    </div>

    <div
      v-else-if="(documentsQuery.data.value?.items.length ?? 0) === 0"
      class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
    >
      配布資料はまだありません
    </div>

    <ListPanel
      v-else
      title="配布資料"
      :description="sessionStore.currentCircle?.name ?? '企画未選択'"
      overflow-hidden
    >
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="document in documentsQuery.data.value?.items"
          :key="document.id"
          :href="buildApiUrl(document.downloadUrl)"
          new-tab
        >
          <template #title>{{ document.name }}</template>
          <template #prefix>
            <span :class="document.isImportant ? 'text-danger' : 'text-muted'">
              {{ document.isImportant ? "!" : "•" }}
            </span>
          </template>
          <template v-if="document.isNew" #suffix>
            <span
              class="rounded-full bg-danger-light px-2 py-0.5 text-xs font-semibold text-danger"
            >
              NEW
            </span>
          </template>
          <template #meta>
            {{ document.updatedAt }} 更新
            <br />
            {{ document.extension || "FILE" }}ファイル • {{ formatFileSize(document.sizeBytes) }}
          </template>
          {{ document.description }}
        </ListItemLink>
      </div>
    </ListPanel>

    <footer
      v-if="documentsQuery.data.value && documentsQuery.data.value.total > 0"
      class="flex flex-wrap items-center justify-between gap-4 rounded border border-border bg-surface px-5 py-4 text-sm text-muted shadow-lv1"
    >
      <p>
        {{ documentsQuery.data.value.total }} 件中
        {{ (documentsQuery.data.value.page - 1) * documentsQuery.data.value.pageSize + 1 }} -
        {{
          Math.min(
            documentsQuery.data.value.page * documentsQuery.data.value.pageSize,
            documentsQuery.data.value.total,
          )
        }}
        件
      </p>
      <div class="flex items-center gap-3">
        <button
          class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="(documentsQuery.data.value?.page ?? 1) <= 1"
          type="button"
          @click="movePage((documentsQuery.data.value?.page ?? 1) - 1)"
        >
          前へ
        </button>
        <span>{{ documentsQuery.data.value.page }} / {{ totalPages }}</span>
        <button
          class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="(documentsQuery.data.value?.page ?? 1) >= totalPages"
          type="button"
          @click="movePage((documentsQuery.data.value?.page ?? 1) + 1)"
        >
          次へ
        </button>
      </div>
    </footer>
  </section>
</template>
