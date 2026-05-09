<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageContentContainer from '@/components/ui/PageContentContainer.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import AsyncBoundary from '@/components/async/AsyncBoundary.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import WorkspaceFormsListContent from '@/features/forms/components/WorkspaceFormsListContent.vue'
import type { TabStripItem } from '@/lib/ui/tabStrip'
import { parseFormStatusTab } from '@/features/forms/formStatusSchema'

const route = useRoute()
const formStatusTab = computed(() => parseFormStatusTab(route.query.status))

const tabs = computed<TabStripItem[]>(() => [
  { label: '受付中', to: { query: {} }, active: formStatusTab.value === 'open' },
  { label: '受付終了', to: { query: { status: 'closed' } }, active: formStatusTab.value === 'closed' },
  { label: '全て', to: { query: { status: 'all' } }, active: formStatusTab.value === 'all' }
])
</script>

<template>
  <PageContentContainer>
    <TabStrip :tabs="tabs" />

    <AsyncBoundary :suspense-key="route.fullPath">
      <template #fallback>
        <LoadingSkeleton variant="list" />
      </template>
      <WorkspaceFormsListContent />
    </AsyncBoundary>
  </PageContentContainer>
</template>
