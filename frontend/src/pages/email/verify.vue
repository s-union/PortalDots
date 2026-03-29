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
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import AuthVerificationStatusContent from '@/features/auth/components/AuthVerificationStatusContent.vue'

const route = useRoute()
const isIndexRoute = computed(() => route.path === '/email/verify')
</script>

<template>
  <section v-if="isIndexRoute" class="mx-auto w-full max-w-[880px] space-y-6 px-6 py-8">
    <AsyncBoundary :suspense-key="route.fullPath">
      <template #fallback>
        <LoadingSkeleton variant="detail" />
      </template>
      <AuthVerificationStatusContent />
    </AsyncBoundary>
  </section>
  <RouterView v-else />
</template>
