<script setup lang="ts">
definePage({
  path: '/staff/circles/all',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.read'
  }
})

import StaffCirclesAllPage from '@/features/staff/circles/components/StaffCirclesAllPage.vue'
</script>

<template>
  <StaffCirclesAllPage />
</template>
