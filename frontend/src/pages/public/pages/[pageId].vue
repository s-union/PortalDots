<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BackLink from '@/components/ui/BackLink.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { buildApiUrl } from '@/lib/api/client'
import { formatFileSize } from '@/lib/format/fileSize'
import { formatDateTime, formatDateTimeUpdated } from '@/lib/format/datetime'
import { usePublicPageDetailQuery } from '@/features/public-home/api'

const route = useRoute('/public/pages/[pageId]')
const pageId = computed(() => String(route.params.pageId ?? ''))
const pageQuery = usePublicPageDetailQuery(pageId, true)
</script>

<template>
  <PageLayout>
    <BackLink to="/public/pages"> お知らせへ戻る </BackLink>

    <div v-if="pageQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <article v-else-if="pageQuery.data.value" class="space-y-6">
      <SurfaceCard>
        <div class="border-b border-border px-6 py-5">
          <h2 class="text-2xl font-semibold text-body">{{ pageQuery.data.value.title }}</h2>
          <div class="mt-3 text-sm text-muted">{{ formatDateTimeUpdated(pageQuery.data.value.publishedAt) }}</div>
        </div>
        <div class="px-6 py-6">
          <p class="whitespace-pre-wrap text-sm leading-8 text-body">
            {{ pageQuery.data.value.body }}
          </p>

          <div v-if="pageQuery.data.value.documents.length > 0" class="mt-8 border-t border-border pt-6">
            <h3 class="text-base font-semibold text-body">関連する配布資料</h3>
            <ul class="mt-4 space-y-3 text-sm">
              <li v-for="document in pageQuery.data.value.documents" :key="document.id">
                <a
                  :href="buildApiUrl(document.downloadUrl)"
                  class="text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  <i
                    v-if="document.isImportant"
                    class="fas fa-exclamation-circle fa-fw text-danger"
                    aria-hidden="true"
                  />
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
  </PageLayout>
</template>
