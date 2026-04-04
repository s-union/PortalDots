<script setup lang="ts">
import { computed } from 'vue'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { formatDateTime } from '@/lib/format/datetime'
import { usePublicPagesQuery } from '@/features/public-home/api'

const pagesQuery = usePublicPagesQuery(
  computed(() => true),
  computed(() => 1),
  computed(() => 10),
  computed(() => '')
)
const pageList = computed(() => pagesQuery.data.value ?? { items: [], page: 1, pageSize: 10, total: 0 })
</script>

<template>
  <div
    v-if="pagesQuery.isPending.value"
    class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
  >
    読み込み中...
  </div>

  <div
    v-else-if="pageList.items.length === 0"
    class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
  >
    お知らせはまだありません
  </div>

  <ListPanel v-else legacy overflow-hidden>
    <div class="divide-y divide-border">
      <ListItemLink
        v-for="page in pageList.items"
        :key="page.id"
        legacy
        :to="`/public/pages/${encodeURIComponent(page.id)}`"
      >
        <template #title>{{ page.title }}</template>
        <template #prefix>
          <StatusBadge :tone="page.isLimited ? 'primary' : 'muted'" appearance="outlined">
            {{ page.isLimited ? '限定公開' : '全員に公開' }}
          </StatusBadge>
        </template>
        <template v-if="page.isNew" #suffix>
          <StatusBadge tone="danger" size="sm">NEW</StatusBadge>
        </template>
        <template #meta>{{ formatDateTime(page.updatedAt) }}</template>
        {{ page.summary }}
      </ListItemLink>
    </div>
  </ListPanel>
</template>
