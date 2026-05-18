<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AsyncBoundary from '@/components/async/AsyncBoundary.vue'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import AuthVerificationStatusContent from '@/features/auth/components/AuthVerificationStatusContent.vue'

const route = useRoute()
const isIndexRoute = computed(() => route.path === '/email/verify')
</script>

<template>
  <NarrowPageLayout v-if="isIndexRoute" class="space-y-6 py-8">
    <AsyncBoundary :suspense-key="route.fullPath">
      <template #fallback>
        <LoadingSkeleton variant="detail" />
      </template>
      <AuthVerificationStatusContent />
    </AsyncBoundary>
  </NarrowPageLayout>
  <RouterView v-else />
</template>
