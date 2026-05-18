<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/activity-logs',
  meta: staffPageMeta('activityLogs.read')
})

import { ref } from 'vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AsyncBoundary from '@/components/async/AsyncBoundary.vue'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton.vue'
import StaffActivityLogsTableContent from '@/features/staff/admin/components/StaffActivityLogsTableContent.vue'

const page = ref(1)
const pageSize = ref(10)

function movePage(nextPage: number) {
  page.value = nextPage
}

function updatePageSize(nextPageSize: number) {
  pageSize.value = nextPageSize
  page.value = 1
}
</script>

<template>
  <PageLayout fullWidth>
    <SurfaceCard overflow-hidden>
      <SurfaceHeader>
        <template #title>アクティビティログ</template>
        <template #description>
          「アクティビティログ」では、PortalDots 内で行われた各種データ操作の履歴を確認できます。
        </template>
      </SurfaceHeader>

      <AsyncBoundary :suspense-key="`${page}-${pageSize}`">
        <template #fallback>
          <div class="px-6 py-5">
            <LoadingSkeleton variant="list" />
          </div>
        </template>
        <StaffActivityLogsTableContent
          :page="page"
          :page-size="pageSize"
          @update:page="movePage"
          @update:page-size="updatePageSize"
        />
      </AsyncBoundary>
    </SurfaceCard>
  </PageLayout>
</template>
