<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AsyncBoundary from '@/components/async/AsyncBoundary.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import WorkspaceFormsListContent from '@/features/forms/components/WorkspaceFormsListContent.vue'
import { parseFormStatusTab } from '@/features/forms/formStatusSchema'
import { routeString } from '@/lib/routeQuery'

const route = useRoute()
const formStatusTab = computed(() => parseFormStatusTab(route.query.status))
const searchQuery = computed(() => routeString(route.query.query).trim())
const tabQuery = computed(() => (searchQuery.value === '' ? {} : { query: searchQuery.value }))

const tabs = computed(() => [
  { label: '受付中', to: { query: tabQuery.value }, active: formStatusTab.value === 'open' },
  {
    label: '受付終了',
    to: { query: { ...tabQuery.value, status: 'closed' } },
    active: formStatusTab.value === 'closed'
  },
  { label: '全て', to: { query: { ...tabQuery.value, status: 'all' } }, active: formStatusTab.value === 'all' }
])
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <AsyncBoundary :suspense-key="route.fullPath">
      <template #fallback>
        <LoadingSkeleton variant="list" />
      </template>
      <WorkspaceFormsListContent />
    </AsyncBoundary>
  </TabbedSettingsPage>
</template>
