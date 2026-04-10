<script setup lang="ts">
definePage({
  path: '/staff/users',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'users.read'
  }
})

import StaffUsersIndexContent from '@/features/staff/users/components/StaffUsersIndexContent.vue'
</script>

<template>
  <StaffUsersIndexContent />
</template>
