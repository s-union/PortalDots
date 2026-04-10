<script setup lang="ts">
definePage({
  path: '/staff/activity-logs',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'activityLogs.read'
  }
})

import { ref } from 'vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AsyncBoundary from '@/components/async/AsyncBoundary.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import StaffActivityLogsTableContent from '@/features/staff/admin/components/StaffActivityLogsTableContent.vue'

const page = ref(1)
const pageSize = 10

function movePage(nextPage: number) {
  page.value = nextPage
}
</script>

<template>
  <PageLayout>
    <SurfaceCard overflow-hidden>
      <SurfaceHeader>
        <template #title>アクティビティログ</template>
        <template #description>
          「アクティビティログ」では、PortalDots 内で行われた各種データ操作の履歴を確認できます。
        </template>
      </SurfaceHeader>

      <AsyncBoundary :suspense-key="page">
        <template #fallback>
          <div class="px-6 py-5">
            <LoadingSkeleton variant="list" />
          </div>
        </template>
        <StaffActivityLogsTableContent :page="page" :page-size="pageSize" @update:page="movePage" />
      </AsyncBoundary>
    </SurfaceCard>
  </PageLayout>
</template>
