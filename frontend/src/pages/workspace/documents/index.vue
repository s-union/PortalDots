<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/components/layouts/PageLayout.vue'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { buildApiUrl } from '@/lib/api/client'
import { formatFileSize } from '@/lib/format/fileSize'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { useDocumentsPageQuery } from '@/features/documents/api'
import { useSessionStore } from '@/features/session/store'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const pageSize = 10
const currentPage = computed(() => {
  const raw = Number(route.query.page ?? 1)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
})
const documentsQuery = useDocumentsPageQuery(
  computed(() => ({
    page: currentPage.value,
    pageSize
  }))
)

watch(
  () => documentsQuery.data.value?.page,
  async (resolvedPage) => {
    if (!resolvedPage || resolvedPage === currentPage.value) {
      return
    }

    await router.replace({
      query: resolvedPage <= 1 ? {} : { page: String(resolvedPage) }
    })
  }
)

async function movePage(nextPage: number) {
  await router.replace({
    query: nextPage <= 1 ? {} : { page: String(nextPage) }
  })
}
</script>

<template>
  <PageLayout>
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

    <ListPanel v-else title="配布資料" :description="sessionStore.currentCircle?.name ?? '企画未選択'" overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="document in documentsQuery.data.value?.items"
          :key="document.id"
          :href="buildApiUrl(document.downloadUrl)"
          new-tab
        >
          <template #title>
            <i v-if="document.isImportant" class="fas fa-exclamation-circle fa-fw text-danger" aria-hidden="true" />
            <i v-else class="far fa-file-alt fa-fw text-muted" aria-hidden="true" />
            {{ document.name }}
          </template>
          <template v-if="document.isNew" #suffix>
            <StatusBadge tone="danger" size="sm">NEW</StatusBadge>
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

    <PaginationFooter
      v-if="documentsQuery.data.value && documentsQuery.data.value.total > 0"
      :page="documentsQuery.data.value.page"
      :page-size="documentsQuery.data.value.pageSize"
      :total="documentsQuery.data.value.total"
      @update:page="movePage"
    />
  </PageLayout>
</template>
