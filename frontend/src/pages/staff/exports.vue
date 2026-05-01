<script setup lang="ts">
definePage({
  path: '/staff/exports',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'exports.use'
  }
})

import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { buildApiUrl } from '@/lib/api/client'
const summaryHref = buildApiUrl('/staff/exports/summary.csv')
const bundleHref = buildApiUrl('/staff/exports/bundle.zip')
</script>

<template>
  <PageLayout>
    <SurfaceCard>
      <SurfaceHeader>
        <template #title>CSV / ZIP 出力</template>
        <template #description>全企画横断の staff export を CSV / ZIP で取得します。</template>
      </SurfaceHeader>

      <div class="divide-y divide-border">
        <article class="px-6 py-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 class="text-base font-medium text-body">Summary CSV</h3>
              <p class="mt-2 text-sm leading-7 text-muted">全企画のリソース一覧を 1 ファイルの CSV で取得します。</p>
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
              <h3 class="text-base font-medium text-body">Bundle ZIP</h3>
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
  </PageLayout>
</template>
