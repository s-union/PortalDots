<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
    redirectWhenAuth: '/workspace/pages'
  }
})

import PageLayout from '@/components/layouts/PageLayout.vue'
import AsyncBoundary from '@/components/async/AsyncBoundary.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import PublicPagesContent from '@/features/public-home/components/PublicPagesContent.vue'
</script>

<template>
  <PageLayout>
    <AsyncBoundary>
      <template #fallback>
        <LoadingSkeleton variant="list" />
      </template>
      <PublicPagesContent />
    </AsyncBoundary>
  </PageLayout>
</template>
