<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'activityLogs.read'
  }
})

import { computed, ref } from 'vue'
import BackLink from '@/components/ui/BackLink.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffActivityLogsQuery } from '@/features/staff/admin/activityLogs'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const page = ref(1)
const pageSize = 10
const activityLogsQuery = useStaffActivityLogsQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize
  }))
)

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

      <div v-if="activityLogsQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>

      <div v-else-if="(activityLogsQuery.data.value?.items.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
        まだ活動ログはありません。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead class="bg-surface-light text-left text-muted-2">
            <tr>
              <th class="px-5 py-3 font-medium">種別</th>
              <th class="px-5 py-3 font-medium">概要</th>
              <th class="px-5 py-3 font-medium">実施者</th>
              <th class="px-5 py-3 font-medium">対象</th>
              <th class="px-5 py-3 font-medium">circle</th>
              <th class="px-5 py-3 font-medium">実施日時</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="entry in activityLogsQuery.data.value?.items" :key="entry.id" class="align-top">
              <td class="px-5 py-4">
                <StatusBadge tone="primary">{{ entry.action }}</StatusBadge>
              </td>
              <td class="px-5 py-4 text-body">{{ entry.summary }}</td>
              <td class="px-5 py-4 text-muted">{{ entry.actorUserId }}</td>
              <td class="px-5 py-4 text-muted">{{ entry.targetType }} / {{ entry.targetId }}</td>
              <td class="px-5 py-4 text-muted">{{ entry.circleId || 'global' }}</td>
              <td class="px-5 py-4 text-muted">{{ entry.createdAt }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationFooter
        v-if="activityLogsQuery.data.value && activityLogsQuery.data.value.total > 0"
        :page="page"
        :page-size="activityLogsQuery.data.value.pageSize"
        :total="activityLogsQuery.data.value.total"
        :bordered="false"
        @update:page="movePage"
      />
    </SurfaceCard>
  </PageLayout>
</template>
