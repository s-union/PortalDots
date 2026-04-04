<script setup lang="ts">
import { toValue, type MaybeRefOrGetter } from 'vue'
import { RouterLink } from 'vue-router'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import { buildApiUrl } from '@/lib/api/client'
import { formatFileSize } from '@/lib/format/fileSize'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { useSuspensePublicPageDetailQuery } from '@/features/public-home/api'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'

const { pageId } = defineProps<{
  pageId: MaybeRefOrGetter<string>
}>()

const pageQuery = useSuspensePublicPageDetailQuery(() => toValue(pageId))
await pageQuery.suspense()
const page = pageQuery.data
</script>

<template>
  <article v-if="page" class="space-y-6">
    <RouterLink
      class="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      to="/public/pages"
    >
      <span aria-hidden="true">‹</span>
      お知らせ
    </RouterLink>

    <SurfaceCard>
      <div class="border-b border-border px-6 py-5">
        <h2 class="text-2xl font-semibold text-body">{{ page.title }}</h2>
        <div class="mt-3 text-sm text-muted">{{ formatDateTimeUpdated(page.updatedAt) }}</div>
        <div v-if="page.isLimited" class="mt-3">
          <StatusBadge tone="primary" appearance="outlined">限定公開</StatusBadge>
        </div>
      </div>
      <div class="px-6 py-6">
        <PageMarkdownContent :source="page.body" />
      </div>
    </SurfaceCard>

    <ListPanel v-if="page.documents && page.documents.length > 0" legacy title="関連する配布資料" overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="document in page.documents"
          :key="document.id"
          legacy
          :href="buildApiUrl(document.downloadUrl)"
          new-tab
        >
          <template #title>
            <i v-if="document.isImportant" class="fas fa-exclamation-circle fa-fw text-danger" aria-hidden="true" />
            <i v-else class="far fa-file-alt fa-fw text-muted" aria-hidden="true" />
            {{ document.name }}
          </template>
          <template #meta>
            {{ formatDateTimeUpdated(document.updatedAt) }}
            <br />
            {{ document.extension || 'FILE' }}ファイル • {{ formatFileSize(document.sizeBytes) }}
          </template>
          {{ document.description }}
        </ListItemLink>
      </div>
    </ListPanel>
  </article>

  <div v-else class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
    お知らせを取得できませんでした。
  </div>
</template>
