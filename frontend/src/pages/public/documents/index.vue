<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
    redirectWhenAuth: '/workspace/documents'
  }
})

import PageLayout from '@/components/layouts/PageLayout.vue'
import AsyncBoundary from '@/components/async/AsyncBoundary.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import PublicDocumentsContent from '@/features/public-home/components/PublicDocumentsContent.vue'
</script>

<template>
  <PageLayout>
    <AsyncBoundary>
      <template #fallback>
        <LoadingSkeleton variant="list" />
      </template>
      <PublicDocumentsContent />
    </AsyncBoundary>
  </PageLayout>
</template>
