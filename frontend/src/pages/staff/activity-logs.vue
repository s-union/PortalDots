<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'activityLogs.read'
  }
})

import { ref } from 'vue'
import BackLink from '@/components/ui/BackLink.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
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
    <PageHeader
      eyebrow="Staff Activity Logs"
      title="活動ログ"
      description="staff 操作の主要な mutation を時系列で確認します。"
    >
      <template #actions>
        <BackLink to="/staff"> Staff top へ戻る </BackLink>
      </template>
    </PageHeader>

    <SurfaceCard overflow-hidden>
      <SurfaceHeader>
        <template #title>
          アクティビティログ
          <StatusBadge tone="muted" size="sm">BETA</StatusBadge>
        </template>
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
