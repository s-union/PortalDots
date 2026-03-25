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
const searchQuery = ref('')
const staffUserSortKeys = [
  'id',
  'lastName',
  'firstName',
  'loginIds',
  'contactEmail',
  'phoneNumber',
  'isStaff',
  'isAdmin',
  'isEmailVerified',
  'isVerified'
] as const
type StaffUserSortKey = (typeof staffUserSortKeys)[number]

const sortKey = ref<StaffUserSortKey>('id')
const sortDirection = ref<'asc' | 'desc'>('asc')
const usersQuery = useStaffUsersQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize: pageSize.value,
    query: searchQuery.value
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
    key: 'lastName',
    label: '姓',
    sortable: true
  },
  {
    key: 'firstName',
    label: '名',
    sortable: true
  },
  {
    key: 'loginIds',
    label: '学生用メールアドレス',
    sortable: true
  },
  {
    key: 'contactEmail',
    label: '連絡先メールアドレス',
    sortable: true
  },
  {
    key: 'phoneNumber',
    label: '電話番号',
    sortable: true
  },
  {
    key: 'isStaff',
    label: 'スタッフ',
    sortable: true,
    align: 'center'
  },
  {
    key: 'isAdmin',
    label: '管理者',
    sortable: true,
    align: 'center'
  },
  {
    key: 'isEmailVerified',
    label: 'メール確認',
    sortable: true,
    align: 'center'
  },
  {
    key: 'isVerified',
    label: '本人確認',
    sortable: true,
    align: 'center'
  }
]

interface StaffUserRow {
  id: string
  lastName: string
  firstName: string
  loginIds: string[]
  contactEmail: string
  phoneNumber: string
  isStaff: boolean
  isAdmin: boolean
  isEmailVerified: boolean
  isVerified: boolean
}

const rows = computed<StaffUserRow[]>(() =>
  (usersQuery.data.value?.items ?? []).map((user) => ({
    id: user.id,
    lastName: user.lastName,
    firstName: user.firstName,
    loginIds: user.loginIds,
    contactEmail: user.contactEmail,
    phoneNumber: user.phoneNumber,
    isStaff: user.roles.some((r) => r !== 'participant'),
    isAdmin: user.roles.includes('admin'),
    isEmailVerified: user.isEmailVerified,
    isVerified: user.isVerified
  }))
)
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

function handleSearch() {
  page.value = 1
}

function isStaffUserSortKey(value: string): value is StaffUserSortKey {
  return (staffUserSortKeys as readonly string[]).includes(value)
}

function toSortableValue(user: StaffUserRow, key: StaffUserSortKey) {
  if (key === 'loginIds') {
    return user.loginIds.join(',').toLowerCase()
  }

  if (key === 'isStaff' || key === 'isAdmin' || key === 'isEmailVerified' || key === 'isVerified') {
    return user[key] ? 1 : 0
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
          <form class="flex items-center gap-2" @submit.prevent="handleSearch">
            <input
              v-model="searchQuery"
              type="search"
              placeholder="姓名・メールアドレスで絞り込み"
              class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              class="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-2 text-sm text-body transition hover:bg-surface-light"
            >
              <i class="fas fa-search fa-fw" aria-hidden="true" />
              絞り込み
            </button>
          </form>
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

        <template #cell-loginIds="{ value }">
          {{ Array.isArray(value) ? value.join(', ') : '-' }}
        </template>

        <template #cell-isStaff="{ value }">
          <StatusBadge :tone="value === true ? 'primary' : 'muted'" size="sm">
            {{ value === true ? 'スタッフ' : '-' }}
          </StatusBadge>
        </template>

        <template #cell-isAdmin="{ value }">
          <StatusBadge :tone="value === true ? 'primary' : 'muted'" size="sm">
            {{ value === true ? '管理者' : '-' }}
          </StatusBadge>
        </template>

        <template #cell-isEmailVerified="{ value }">
          <StatusBadge :tone="value === true ? 'success' : 'muted'" size="sm">
            {{ value === true ? '確認済み' : '未確認' }}
          </StatusBadge>
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
