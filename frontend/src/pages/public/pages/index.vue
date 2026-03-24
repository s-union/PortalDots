<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
    redirectWhenAuth: '/workspace/pages'
  }
})

import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { usePublicPagesQuery } from '@/features/public-home/api'

const pagesQuery = usePublicPagesQuery(true)
</script>

<template>
  <PageLayout>
    <div v-if="pagesQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <div
      v-else-if="(pagesQuery.data.value?.length ?? 0) === 0"
      class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
    >
      お知らせはまだありません
    </div>

    <ListPanel v-else legacy overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="page in pagesQuery.data.value"
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
          <template #meta>{{ page.publishedAt }}</template>
          {{ page.summary }}
        </ListItemLink>
      </div>
    </ListPanel>
  </PageLayout>
</template>
