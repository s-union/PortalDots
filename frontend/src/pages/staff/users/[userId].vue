<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'users.edit'
  }
})

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BackLink from '@/components/ui/BackLink.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffUserEditor from '@/components/staff/StaffUserEditor.vue'

const route = useRoute('/staff/users/[userId]')
const router = useRouter()
const userId = computed(() => String(route.params.userId ?? ''))
async function handleDeleted() {
  await router.push('/staff/users')
}
</script>

<template>
  <PageLayout>
    <BackLink to="/staff/users"> ユーザー管理へ戻る </BackLink>
    <StaffUserEditor :user-id="userId" @deleted="handleDeleted" />
  </PageLayout>
</template>
