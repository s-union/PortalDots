<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/users',
  meta: staffPageMeta('users.read')
})

import StaffUsersIndexContent from '@/features/staff/users/components/StaffUsersIndexContent.vue'
</script>

<template>
  <StaffUsersIndexContent />
</template>
