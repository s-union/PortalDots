<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AsyncBoundary from '@/components/async/AsyncBoundary.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import PublicPageDetailContent from '@/features/public-home/components/PublicPageDetailContent.vue'

const route = useRoute('/public/pages/[pageId]')
const pageId = computed(() => String(route.params.pageId ?? ''))
</script>

<template>
  <PageLayout>
    <AsyncBoundary :suspense-key="pageId">
      <template #fallback>
        <LoadingSkeleton variant="detail" />
      </template>
      <PublicPageDetailContent :page-id="pageId" />
    </AsyncBoundary>
  </PageLayout>
</template>
