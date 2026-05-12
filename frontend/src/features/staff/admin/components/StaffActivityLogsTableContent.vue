<script setup lang="ts">
import { computed, ref } from 'vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ToolbarRow from '@/components/ui/ToolbarRow.vue'
import { useSuspenseStaffActivityLogsQuery } from '@/features/staff/admin/activityLogs'

const { page, pageSize } = defineProps<{
  page: number
  pageSize: number
}>()

const emit = defineEmits<{
  'update:page': [nextPage: number]
  'update:pageSize': [nextPageSize: number]
}>()

const searchQuery = ref('')
const staffListParams = computed(() => ({
  query: searchQuery.value
}))

const columns: StaffDataGridColumn[] = [
  { key: 'action', label: '種別', sortable: false },
  { key: 'summary', label: '概要', sortable: false, cellClass: 'min-w-80 whitespace-normal text-body' },
  { key: 'actorUserId', label: '実施者', sortable: false },
  { key: 'target', label: '対象', sortable: false },
  { key: 'circleId', label: 'circle', sortable: false },
  { key: 'createdAt', label: '実施日時', sortable: false }
]

const query = useSuspenseStaffActivityLogsQuery(
  computed(() => ({
    page,
    pageSize
  })),
  staffListParams
)
await query.suspense()
const activityLogs = query.data

const allRows = computed<StaffDataGridRow[]>(() =>
  (activityLogs.value?.items ?? []).map((entry) => ({
    ...entry,
    target: `${entry.targetType} / ${entry.targetId}`,
    circleId: entry.circleId || 'global'
  }))
)

const rows = computed<StaffDataGridRow[]>(() => allRows.value)

const total = computed(() => activityLogs.value?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function setFirstPage() {
  emit('update:page', 1)
}

function setPrevPage() {
  emit('update:page', Math.max(1, page - 1))
}

function setNextPage() {
  emit('update:page', Math.min(totalPages.value, page + 1))
}

function setLastPage() {
  emit('update:page', totalPages.value)
}
</script>

<template>
  <StaffDataGrid
    :rows="rows"
    :columns="columns"
    :page="page"
    :page-size="pageSize"
    :total="total"
    empty-message="まだ活動ログはありません。"
    table-label="アクティビティログ一覧"
    @first="setFirstPage"
    @prev="setPrevPage"
    @next="setNextPage"
    @last="setLastPage"
    @reload="query.refetch()"
    @update:page-size="emit('update:pageSize', $event)"
  >
    <template #toolbar>
      <ToolbarRow>
        <form class="flex items-center gap-2" @submit.prevent>
          <input v-model="searchQuery" aria-label="アクティビティログを検索" type="search" />
        </form>
        <p class="text-sm text-muted">現在の表示件数: {{ rows.length }} / 全{{ total }}件</p>
      </ToolbarRow>
    </template>

    <template #cell-action="{ value }">
      <StatusBadge tone="primary">{{ value }}</StatusBadge>
    </template>
  </StaffDataGrid>
</template>
