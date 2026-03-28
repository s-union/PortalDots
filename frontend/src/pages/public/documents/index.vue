<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
    redirectWhenAuth: '/workspace/documents'
  }
})

import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { buildApiUrl } from '@/lib/api/client'
import { formatFileSize } from '@/lib/format/fileSize'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { usePublicDocumentsQuery } from '@/features/public-home/api'

const documentsQuery = usePublicDocumentsQuery(true)
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
      v-else-if="(documentsQuery.data.value?.length ?? 0) === 0"
      class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
    >
      配布資料はまだありません
    </div>

    <ListPanel v-else legacy overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="document in documentsQuery.data.value"
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
  </PageLayout>
</template>
