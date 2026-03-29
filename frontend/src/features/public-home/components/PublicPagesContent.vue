<script setup lang="ts">
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { formatDateTime } from '@/lib/format/datetime'
import { useSuspensePublicPagesQuery } from '@/features/public-home/api'

const pagesQuery = useSuspensePublicPagesQuery()
await pagesQuery.suspense()
const pages = pagesQuery.data
</script>

<template>
  <div
    v-if="!pages || pages.length === 0"
    class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
  >
    お知らせはまだありません
  </div>

  <ListPanel v-else legacy overflow-hidden>
    <div class="divide-y divide-border">
      <ListItemLink v-for="page in pages" :key="page.id" legacy :to="`/public/pages/${encodeURIComponent(page.id)}`">
        <template #title>{{ page.title }}</template>
        <template #prefix>
          <StatusBadge :tone="page.isLimited ? 'primary' : 'muted'" appearance="outlined">
            {{ page.isLimited ? '限定公開' : '全員に公開' }}
          </StatusBadge>
        </template>
        <template v-if="page.isNew" #suffix>
          <StatusBadge tone="danger" size="sm">NEW</StatusBadge>
        </template>
        <template #meta>{{ formatDateTime(page.publishedAt) }}</template>
        {{ page.summary }}
      </ListItemLink>
    </div>
  </ListPanel>
</template>
