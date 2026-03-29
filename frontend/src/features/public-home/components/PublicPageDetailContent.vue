<script setup lang="ts">
import { toValue, type MaybeRefOrGetter } from 'vue'
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

        <div v-if="page.documents && page.documents.length > 0" class="mt-8 border-t border-border pt-6">
          <h3 class="text-base font-semibold text-body">関連する配布資料</h3>
          <ul class="mt-4 space-y-3 text-sm">
            <li v-for="document in page.documents" :key="document.id">
              <a
                :href="buildApiUrl(document.downloadUrl)"
                class="text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                <i v-if="document.isImportant" class="fas fa-exclamation-circle fa-fw text-danger" aria-hidden="true" />
                <i v-else class="far fa-file-alt fa-fw text-muted" aria-hidden="true" />
                {{ document.name }}
              </a>
              <p class="mt-1 text-xs text-muted">
                {{ formatDateTimeUpdated(document.updatedAt) }} / {{ document.extension || 'FILE' }} /
                {{ formatFileSize(document.sizeBytes) }}
              </p>
              <p v-if="document.description" class="mt-1 text-muted">
                {{ document.description }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </SurfaceCard>
  </article>

  <div v-else class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
    お知らせを取得できませんでした。
  </div>
</template>
