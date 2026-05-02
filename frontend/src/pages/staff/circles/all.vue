<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/circles/all',
  meta: staffPageMeta('circles.read')
})

import StaffCirclesAllPage from '@/features/staff/circles/components/StaffCirclesAllPage.vue'
</script>

<template>
  <StaffCirclesAllPage />
</template>
