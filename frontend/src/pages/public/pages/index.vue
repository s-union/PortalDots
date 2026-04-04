<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
    redirectWhenAuth: '/workspace/pages'
  }
})

import PageLayout from '@/components/layouts/PageLayout.vue'
import PublicPagesContent from '@/features/public-home/components/PublicPagesContent.vue'
</script>

<template>
  <PageLayout>
    <PublicPagesContent />
  </PageLayout>
</template>
