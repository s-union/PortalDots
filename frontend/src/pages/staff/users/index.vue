<script setup lang="ts">
definePage({
  path: '/staff/users',
  meta: staffPageMeta('users.read')
})

import { staffPageMeta } from '@/lib/pageMeta'

import StaffUsersIndexContent from '@/features/staff/users/components/StaffUsersIndexContent.vue'
</script>

<template>
  <StaffUsersIndexContent />
</template>
