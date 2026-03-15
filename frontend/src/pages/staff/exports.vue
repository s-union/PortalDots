<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    requiresCircle: true,
    staffCapability: "exports.use",
  },
});

import { computed } from "vue";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";
import { buildApiUrl } from "@/lib/api/client";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();

const summaryHref = computed(() => buildApiUrl("/staff/exports/summary.csv"));
const bundleHref = computed(() => buildApiUrl("/staff/exports/bundle.zip"));
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div>
        <p class="text-sm text-primary">Staff Exports</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">CSV / ZIP 出力</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          {{ sessionStore.currentCircle?.name ?? "企画未選択" }} のお知らせ・資料・フォーム・回答を
          staff mode で書き出します。
        </p>
      </div>
      <BackLink to="/staff"> Staff top へ戻る </BackLink>
    </header>

    <SurfaceCard>
      <SurfaceHeader>
        <template #title>書き出しメニュー</template>
        <template #description>
          旧実装の staff export と同じく、現在の企画に紐づく情報を CSV / ZIP で取得します。
        </template>
      </SurfaceHeader>

      <div class="divide-y divide-border">
        <article class="px-6 py-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 class="text-base font-medium text-body">Summary CSV</h4>
              <p class="mt-2 text-sm leading-7 text-muted">
                現在の企画に紐づくリソース一覧を 1 ファイルの CSV で取得します。
              </p>
            </div>
            <a
              class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
              :href="summaryHref"
            >
              CSV をダウンロード
            </a>
          </div>
        </article>

        <article class="px-6 py-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 class="text-base font-medium text-body">Bundle ZIP</h4>
              <p class="mt-2 text-sm leading-7 text-muted">
                pages / documents / forms / answers を個別 CSV に分けた ZIP を取得します。
              </p>
            </div>
            <a
              class="inline-flex rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              :href="bundleHref"
            >
              ZIP をダウンロード
            </a>
          </div>
        </article>
      </div>
    </SurfaceCard>
  </section>
</template>
