<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'users.read'
  }
})

import { computed, ref, watchEffect } from 'vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffFilterDrawer, {
  type StaffFilterField,
  type StaffFilterQuery
} from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffUserEditor from '@/components/staff/StaffUserEditor.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildStaffUsersExportUrl,
  type StaffUserFilterQuery,
  type StaffUserFilterKey,
  type StaffUserFilterMode,
  type StaffUserFilterOperator,
  type StaffUserSortKey,
  useStaffUsersQuery
} from '@/features/staff/users/api'
import { useSessionStore } from '@/features/session/store'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))

const searchQuery = ref('')
const isEditorOpen = ref(false)
const isFilterOpen = ref(false)
const selectedUserId = ref('')
const nextFilterId = ref(1)
const appliedFilterMode = ref<StaffUserFilterMode>('and')
const appliedFilterQueries = ref<StaffUserFilterQuery[]>([])
const draftFilterMode = ref<StaffUserFilterMode>('and')
const draftFilterQueries = ref<StaffFilterQuery[]>([])
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

const isStaffUserSortKey = createSortKeyGuard(staffUserSortKeys)
const totalUsers = ref(0)
const sort = useSortState<StaffUserSortKey>('id')
const pagination = usePaginationState(totalUsers)

const usersQuery = useStaffUsersQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: pagination.page.value,
    pageSize: pagination.pageSize.value,
    query: searchQuery.value,
    sortKey: sort.sortKey.value,
    sortDirection: sort.sortDirection.value,
    queries: appliedFilterQueries.value,
    mode: appliedFilterMode.value
  }))
)

watchEffect(() => {
  totalUsers.value = usersQuery.data.value?.total ?? 0
})

const exportUrl = buildStaffUsersExportUrl()

const filterFields: StaffFilterField[] = [
  { key: 'id', label: 'ユーザーID', type: 'string' },
  { key: 'lastName', label: '姓', type: 'string' },
  { key: 'firstName', label: '名', type: 'string' },
  { key: 'loginIds', label: '学生用メールアドレス', type: 'string' },
  { key: 'contactEmail', label: '連絡先メールアドレス', type: 'string' },
  { key: 'phoneNumber', label: '電話番号', type: 'string' },
  { key: 'isStaff', label: 'スタッフ', type: 'bool' },
  { key: 'isAdmin', label: '管理者', type: 'bool' },
  { key: 'isEmailVerified', label: 'メール確認', type: 'bool' },
  { key: 'isVerified', label: '本人確認', type: 'bool' }
]

const columns: StaffDataGridColumn[] = [
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
const gridRows = computed<StaffDataGridRow[]>(() => rows.value.map((user) => ({ ...user })))

function handleSort(nextKey: string) {
  if (!isStaffUserSortKey(nextKey)) {
    return
  }

  sort.toggleSort(nextKey)
  pagination.resetPage()
}

async function handleReload() {
  if (typeof usersQuery.refetch === 'function') {
    await usersQuery.refetch()
  }
}

function handleSearch() {
  pagination.resetPage()
}

function openFilter() {
  draftFilterQueries.value = toDraftFilterQueries(appliedFilterQueries.value)
  draftFilterMode.value = appliedFilterMode.value
  syncNextFilterId()
  isFilterOpen.value = true
}

function closeFilter() {
  isFilterOpen.value = false
}

function handleAddFilter(keyName: string) {
  if (!isStaffUserFilterKey(keyName)) {
    return
  }

  const field = filterFields.find((item) => item.key === keyName)
  if (!field) {
    return
  }

  const defaultOperator = field.type === 'bool' ? '=' : 'like'
  const defaultValue = field.type === 'bool' ? 'true' : ''
  draftFilterQueries.value = [
    ...draftFilterQueries.value,
    {
      id: nextFilterId.value++,
      keyName,
      operator: defaultOperator,
      value: defaultValue
    }
  ]
}

function handleRemoveFilter(queryId: number) {
  draftFilterQueries.value = draftFilterQueries.value.filter((query) => query.id !== queryId)
}

function handleUpdateFilter(queryId: number, patch: Partial<Omit<StaffFilterQuery, 'id'>>) {
  draftFilterQueries.value = draftFilterQueries.value.map((query) => {
    if (query.id !== queryId) {
      return query
    }
    return {
      ...query,
      ...patch
    }
  })
}

function handleApplyFilters() {
  appliedFilterQueries.value = toAppliedFilterQueries(draftFilterQueries.value)
  appliedFilterMode.value = draftFilterMode.value
  pagination.resetPage()
  closeFilter()
}

function handleClearFilters() {
  appliedFilterQueries.value = []
  draftFilterQueries.value = []
  appliedFilterMode.value = 'and'
  draftFilterMode.value = 'and'
  pagination.resetPage()
  closeFilter()
}

function toDraftFilterQueries(queries: StaffUserFilterQuery[]) {
  return queries.map((query, index) => ({
    id: index + 1,
    keyName: query.keyName,
    operator: query.operator,
    value: query.value
  }))
}

function toAppliedFilterQueries(queries: StaffFilterQuery[]) {
  const normalized: StaffUserFilterQuery[] = []
  for (const query of queries) {
    if (!isStaffUserFilterKey(query.keyName)) {
      continue
    }
    normalized.push({
      keyName: query.keyName,
      operator: query.operator as StaffUserFilterOperator,
      value: query.value
    })
  }
  return normalized
}

function syncNextFilterId() {
  const maxId = draftFilterQueries.value.reduce((max, query) => Math.max(max, query.id), 0)
  nextFilterId.value = maxId + 1
}

function openEditor(userId: string) {
  selectedUserId.value = userId
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
}

function editorPopUpUrl() {
  if (selectedUserId.value.length === 0) {
    return undefined
  }

  return `/staff/users/${encodeURIComponent(selectedUserId.value)}`
}

function handleSaved() {
  void handleReload()
}

function handleDeleted() {
  closeEditor()
  selectedUserId.value = ''
  void handleReload()
}

function isStaffUserFilterKey(value: string): value is StaffUserFilterKey {
  return filterFields.some((field) => field.key === value)
}

function handleFilterModeUpdate(mode: StaffUserFilterMode) {
  draftFilterMode.value = mode
}
</script>

<template>
  <StaffSideWindowContainer :is-open="isEditorOpen || isFilterOpen">
    <PageLayout class="max-w-full">
      <DataCard title="ユーザー情報管理" overflow-hidden>
        <StaffDataGrid
          :rows="gridRows"
          :columns="columns"
          :page="pagination.page.value"
          :page-size="pagination.pageSize.value"
          :total="usersQuery.data.value?.total ?? 0"
          :loading="usersQuery.isPending.value"
          :sort-key="sort.sortKey.value"
          :sort-direction="sort.sortDirection.value"
          :show-filter-button="true"
          :filter-active="searchQuery.length > 0 || appliedFilterQueries.length > 0"
          empty-message="対象ユーザーが見つかりませんでした。"
          table-label="staff users"
          @first="pagination.setFirstPage"
          @prev="pagination.setPrevPage"
          @next="pagination.setNextPage"
          @last="pagination.setLastPage"
          @reload="handleReload"
          @sort="handleSort"
          @filter="openFilter"
          @update:page-size="pagination.setPageSize"
        >
          <template #toolbar>
            <form class="flex items-center gap-2" @submit.prevent="handleSearch">
              <input
                v-model="searchQuery"
                type="search"
                placeholder="姓名・メールアドレス・学生用メールアドレスで絞り込み"
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
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-body transition hover:bg-surface-light"
              title="編集"
              type="button"
              @click="openEditor(String(row.id))"
            >
              <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
            </button>
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
  </StaffSideWindowContainer>

  <StaffSideWindow
    :is-open="isEditorOpen"
    :pop-up-url="editorPopUpUrl()"
    title="ユーザーを編集"
    @click-close="closeEditor"
  >
    <StaffUserEditor
      v-if="selectedUserId.length > 0"
      :user-id="selectedUserId"
      @deleted="handleDeleted"
      @saved="handleSaved"
    />
  </StaffSideWindow>

  <StaffSideWindow :is-open="isFilterOpen" title="絞り込み" @click-close="closeFilter">
    <StaffFilterDrawer
      :fields="filterFields"
      :queries="draftFilterQueries"
      :mode="draftFilterMode"
      :loading="usersQuery.isPending.value"
      @add="handleAddFilter"
      @remove="handleRemoveFilter"
      @update-query="handleUpdateFilter"
      @update-mode="handleFilterModeUpdate"
      @apply="handleApplyFilters"
      @clear="handleClearFilters"
    />
  </StaffSideWindow>
</template>
