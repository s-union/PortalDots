<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'users.read'
  }
})

import { computed, ref } from 'vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { buildStaffUsersExportUrl, useStaffUsersQuery } from '@/features/staff/users/api'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const page = ref(1)
const pageSize = ref(25)
const staffUserSortKeys = ['id', 'displayName', 'loginIds', 'roles', 'isVerified'] as const
type StaffUserSortKey = (typeof staffUserSortKeys)[number]

const sortKey = ref<StaffUserSortKey>('id')
const sortDirection = ref<'asc' | 'desc'>('asc')
const usersQuery = useStaffUsersQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize: pageSize.value
  }))
)
const exportUrl = buildStaffUsersExportUrl()

const columns: StaffDataGridColumn[] = [
  {
    key: 'id',
    label: 'ユーザーID',
    sortable: true
  },
  {
    key: 'displayName',
    label: 'ユーザー',
    sortable: true
  },
  {
    key: 'loginIds',
    label: 'ログイン ID',
    sortable: true
  },
  {
    key: 'roles',
    label: 'ユーザー種別',
    sortable: true
  },
  {
    key: 'isVerified',
    label: '本人確認',
    sortable: true,
    align: 'center'
  }
]

const rows = computed<StaffUserRow[]>(() => usersQuery.data.value?.items ?? [])
const sortedRows = computed<StaffUserRow[]>(() => {
  const cloned = [...rows.value]
  const direction = sortDirection.value === 'asc' ? 1 : -1
  const key = sortKey.value

  cloned.sort((left, right) => {
    const leftValue = toSortableValue(left, key)
    const rightValue = toSortableValue(right, key)

    if (leftValue < rightValue) {
      return -1 * direction
    }
    if (leftValue > rightValue) {
      return direction
    }
    return 0
  })

  return cloned
})
const gridRows = computed<StaffDataGridRow[]>(() => sortedRows.value.map((user) => ({ ...user })))

function handleSort(nextKey: string) {
  if (!isStaffUserSortKey(nextKey)) {
    return
  }

  if (sortKey.value === nextKey) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortKey.value = nextKey
  sortDirection.value = 'asc'
}

function handleFirstPage() {
  page.value = 1
}

function handlePrevPage() {
  page.value = Math.max(1, page.value - 1)
}

function handleNextPage() {
  const total = usersQuery.data.value?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize.value))
  page.value = Math.min(totalPages, page.value + 1)
}

function handleLastPage() {
  const total = usersQuery.data.value?.total ?? 0
  page.value = Math.max(1, Math.ceil(total / pageSize.value))
}

async function handleReload() {
  if (typeof usersQuery.refetch === 'function') {
    await usersQuery.refetch()
  }
}

function handlePageSizeChange(nextSize: number) {
  pageSize.value = nextSize
  page.value = 1
}

interface StaffUserRow {
  id: string
  displayName: string
  loginIds: string[]
  roles: string[]
  isVerified: boolean
}

function isStaffUserSortKey(value: string): value is StaffUserSortKey {
  return (staffUserSortKeys as readonly string[]).includes(value)
}

function toSortableValue(user: StaffUserRow, key: StaffUserSortKey) {
  if (key === 'loginIds') {
    return user.loginIds.join(',').toLowerCase()
  }

  if (key === 'roles') {
    return user.roles.join(',').toLowerCase()
  }

  if (key === 'isVerified') {
    return user.isVerified ? 1 : 0
  }

  return String(user[key]).toLowerCase()
}
</script>

<template>
  <PageLayout>
    <DataCard title="ユーザー情報管理" overflow-hidden>
      <StaffDataGrid
        :rows="gridRows"
        :columns="columns"
        :page="page"
        :page-size="pageSize"
        :total="usersQuery.data.value?.total ?? 0"
        :loading="usersQuery.isPending.value"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        empty-message="対象ユーザーが見つかりませんでした。"
        table-label="staff users"
        @first="handleFirstPage"
        @prev="handlePrevPage"
        @next="handleNextPage"
        @last="handleLastPage"
        @reload="handleReload"
        @sort="handleSort"
        @update:page-size="handlePageSizeChange"
      >
        <template #toolbar>
          <a
            :href="exportUrl"
            class="inline-flex items-center gap-2 rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light hover:no-underline"
          >
            <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
            CSVで出力
          </a>
        </template>

        <template #actions="{ row }">
          <RouterLink
            :to="`/staff/users/${String(row.id)}`"
            class="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-body transition hover:bg-surface-light"
            title="編集"
          >
            <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
          </RouterLink>
        </template>

        <template #cell-displayName="{ value }">
          <p class="font-medium text-body">{{ String(value) }}</p>
        </template>

        <template #cell-loginIds="{ value }">
          {{ Array.isArray(value) ? value.join(', ') : '-' }}
        </template>

        <template #cell-roles="{ value }">
          <div class="flex flex-wrap gap-2">
            <StatusBadge v-for="role in Array.isArray(value) ? value : []" :key="String(role)" tone="primary" size="sm">
              {{ String(role) }}
            </StatusBadge>
          </div>
        </template>

        <template #cell-isVerified="{ value }">
          <StatusBadge :tone="value === true ? 'success' : 'danger'" size="sm">
            {{ value === true ? '確認済み' : '未確認' }}
          </StatusBadge>
        </template>
      </StaffDataGrid>
    </DataCard>
  </PageLayout>
</template>
