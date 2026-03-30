<script setup lang="ts">
definePage({
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
