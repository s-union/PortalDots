import { computed, ref, watchEffect } from 'vue'
import type { StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import type { StaffFilterField, StaffFilterQuery } from '@/components/staff/StaffFilterDrawer.vue'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildStaffUsersExportUrl,
  type StaffUserFilterKey,
  type StaffUserFilterMode,
  type StaffUserFilterOperator,
  type StaffUserFilterQuery,
  type StaffUserSortKey,
  useStaffUsersQuery
} from '@/features/staff/users/api'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'

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

interface StaffUserRow extends StaffDataGridRow {
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

const isStaffUserSortKey = createSortKeyGuard(staffUserSortKeys)
const staffUserFilterOperators = ['=', '!=', 'like', 'not like'] as const

export function useStaffUsersIndexPage() {
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

  const rows = computed<StaffUserRow[]>(() =>
    (usersQuery.data.value?.items ?? []).map((user) => ({
      id: user.id,
      lastName: user.lastName,
      firstName: user.firstName,
      loginIds: user.loginIds,
      contactEmail: user.contactEmail,
      phoneNumber: user.phoneNumber,
      isStaff: user.roles.some((role) => role !== 'participant'),
      isAdmin: user.roles.includes('admin'),
      isEmailVerified: user.isEmailVerified,
      isVerified: user.isVerified
    }))
  )
  const gridRows = computed<StaffDataGridRow[]>(() => rows.value.map((user) => ({ ...user })))
  const exportUrl = buildStaffUsersExportUrl()
  const filterActive = computed(() => searchQuery.value.length > 0 || appliedFilterQueries.value.length > 0)

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
    const maxId = draftFilterQueries.value.reduce((max, query) => Math.max(max, query.id), 0)
    nextFilterId.value = maxId + 1
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

    draftFilterQueries.value = [
      ...draftFilterQueries.value,
      {
        id: nextFilterId.value++,
        keyName,
        operator: field.type === 'bool' ? '=' : 'like',
        value: field.type === 'bool' ? 'true' : ''
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

  function handleFilterModeUpdate(mode: StaffUserFilterMode) {
    draftFilterMode.value = mode
  }

  return {
    closeEditor,
    closeFilter,
    draftFilterMode,
    draftFilterQueries,
    editorPopUpUrl,
    exportUrl,
    filterActive,
    filterFields,
    gridRows,
    handleAddFilter,
    handleApplyFilters,
    handleClearFilters,
    handleDeleted,
    handleFilterModeUpdate,
    handleReload,
    handleRemoveFilter,
    handleSaved,
    handleSearch,
    handleSort,
    handleUpdateFilter,
    isEditorOpen,
    isFilterOpen,
    openEditor,
    openFilter,
    pagination,
    searchQuery,
    selectedUserId,
    sort,
    usersQuery
  }
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
    if (!isStaffUserFilterKey(query.keyName) || !isStaffUserFilterOperator(query.operator)) {
      continue
    }
    normalized.push({
      keyName: query.keyName,
      operator: query.operator,
      value: query.value
    })
  }
  return normalized
}

function isStaffUserFilterKey(value: string): value is StaffUserFilterKey {
  return filterFields.some((field) => field.key === value)
}

function isStaffUserFilterOperator(value: string): value is StaffUserFilterOperator {
  return (staffUserFilterOperators as readonly string[]).includes(value)
}
