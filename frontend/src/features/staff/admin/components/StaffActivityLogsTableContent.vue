<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTime } from '@/lib/format/datetime'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useSuspenseStaffActivityLogsQuery } from '@/features/staff/admin/activityLogs'

const { page, pageSize } = defineProps<{
  page: number
  pageSize: number
}>()

const emit = defineEmits<{
  'update:page': [nextPage: number]
}>()

const query = useSuspenseStaffActivityLogsQuery(
  computed(() => ({
    page,
    pageSize
  }))
)
await query.suspense()
const activityLogs = query.data

function movePage(nextPage: number) {
  emit('update:page', nextPage)
}
</script>

<template>
  <div v-if="(activityLogs?.items.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
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
        <tr v-for="entry in activityLogs?.items" :key="entry.id" class="align-top">
          <td class="px-5 py-4">
            <StatusBadge tone="primary">{{ entry.action }}</StatusBadge>
          </td>
          <td class="px-5 py-4 text-body">{{ entry.summary }}</td>
          <td class="px-5 py-4 text-muted">{{ entry.actorUserId }}</td>
          <td class="px-5 py-4 text-muted">{{ entry.targetType }} / {{ entry.targetId }}</td>
          <td class="px-5 py-4 text-muted">{{ entry.circleId || 'global' }}</td>
          <td class="px-5 py-4 text-muted">{{ formatDateTime(entry.createdAt) }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <PaginationFooter
    v-if="activityLogs && activityLogs.total > 0"
    :page="page"
    :page-size="activityLogs.pageSize"
    :total="activityLogs.total"
    :bordered="false"
    @update:page="movePage"
  />
</template>
