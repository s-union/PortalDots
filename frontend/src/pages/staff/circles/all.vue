<script setup lang="ts">
definePage({
  path: '/staff/circles/all',
  meta: staffPageMeta('circles.read')
})

import { staffPageMeta } from '@/lib/pageMeta'

import StaffCirclesAllPage from '@/features/staff/circles/components/StaffCirclesAllPage.vue'
</script>

<template>
  <StaffCirclesAllPage />
</template>
