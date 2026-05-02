<script setup lang="ts">
definePage({
  path: '/staff/users/:userId',
  meta: staffPageMeta('users.edit')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffUserEditor from '@/features/staff/users/components/StaffUserEditor.vue'

const route = useRoute('/staff/users/[userId]')
const router = useRouter()
const userId = computed(() => String(route.params.userId ?? ''))
async function handleDeleted() {
  await router.push('/staff/users')
}
</script>

<template>
  <PageLayout>
    <StaffUserEditor :user-id="userId" @deleted="handleDeleted" />
  </PageLayout>
</template>
