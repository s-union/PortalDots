import { computed, ref, watch, type Ref } from 'vue'
import {
  normalizeStaffFilterMode,
  normalizeStaffFilterOperator,
  type StaffFilterMode,
  type StaffFilterQuery
} from '@/lib/staffFilterSchema'
import {
  buildStaffCirclesExportUrl,
  extractStaffCircleValidationMessage,
  useAllStaffCirclesQuery,
  useDeleteStaffCircleMutation
} from '@/features/staff/circles/api'
import { usePaginationState } from '@/lib/usePaginationState'
import { useSortState } from '@/lib/useSortState'
import { z } from 'zod'
import {
  filterFields,
  isStaffCircleFilterKey,
  resolveCircleSortValue,
  type StaffCircleRow,
  type StaffCircleSortKey
} from '@/features/staff/circles/helpers/circleFilters'

const staffCircleSortKeys = [
  'id',
  'participationTypeName',
  'name',
  'nameYomi',
  'groupName',
  'groupNameYomi',
  'notes',
  'submittedAt',
  'status'
] as const
const staffCircleSortKeySchema = z.enum(staffCircleSortKeys)

function isStaffCircleSortKey(value: string): value is StaffCircleSortKey {
  return staffCircleSortKeySchema.safeParse(value).success
}

export interface UseStaffCirclesAllPageOptions {
  enabled: Ref<boolean>
}

export function useStaffCirclesAllPage(options: UseStaffCirclesAllPageOptions) {
  const { enabled } = options

  // Filter state
  const searchQuery = ref('')
  const isFilterOpen = ref(false)
  const nextFilterId = ref(1)
  const appliedFilterMode = ref<StaffFilterMode>('and')
  const appliedFilterQueries = ref<StaffFilterQuery[]>([])
  const draftFilterMode = ref<StaffFilterMode>('and')
  const draftFilterQueries = ref<StaffFilterQuery[]>([])
  const staffListParams = computed(() => ({
    query: searchQuery.value,
    queries: appliedFilterQueries.value,
    mode: appliedFilterMode.value
  }))

  // Queries
  const allCirclesQuery = useAllStaffCirclesQuery(enabled, staffListParams)

  // Mutations
  const deletingCircleId = ref('')
  const deleteCircleMutation = useDeleteStaffCircleMutation(computed(() => deletingCircleId.value))

  const errorMessage = ref('')
  const exportUrl = buildStaffCirclesExportUrl()

  // Computed rows
  const rows = computed<StaffCircleRow[]>(() => allCirclesQuery.data.value ?? [])

  const filteredRows = computed<StaffCircleRow[]>(() => {
    return rows.value
  })

  // Sorting
  const sort = useSortState<StaffCircleSortKey>('id')

  const sortedRows = computed<StaffCircleRow[]>(() => {
    const cloned = [...filteredRows.value]
    const direction = sort.sortDirection.value === 'asc' ? 1 : -1
    const key = sort.sortKey.value

    cloned.sort((left, right) => {
      const leftValue = resolveCircleSortValue(left, key)
      const rightValue = resolveCircleSortValue(right, key)

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

  // Pagination
  const pagination = usePaginationState(computed(() => sortedRows.value.length))

  const pagedRows = computed<StaffCircleRow[]>(() => {
    const start = (pagination.page.value - 1) * pagination.pageSize.value
    const end = start + pagination.pageSize.value
    return sortedRows.value.slice(start, end)
  })

  const filterActive = computed(() => searchQuery.value.trim().length > 0 || appliedFilterQueries.value.length > 0)

  // Pagination auto-adjust
  watch(
    () => [sortedRows.value.length, pagination.pageSize.value] as const,
    ([total, currentPageSize]) => {
      const totalPages = Math.max(1, Math.ceil(total / currentPageSize))
      if (pagination.page.value > totalPages) {
        pagination.page.value = totalPages
      }
    }
  )

  // Handlers
  function handleSort(nextKey: string) {
    if (!isStaffCircleSortKey(nextKey)) {
      return
    }

    sort.toggleSort(nextKey)
    // Note: In circles/all.vue, page is not reset on sort toggle (original behavior)
  }

  async function handleReload() {
    if (typeof allCirclesQuery.refetch === 'function') {
      await allCirclesQuery.refetch()
    }
  }

  function handleSearch() {
    pagination.resetPage()
  }

  async function handleDeleteCircle(circleId: string, circleName: string) {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `企画「${circleName}」を削除しますか？\n\n• 「${circleName}」が送信した申請の回答はすべて削除されます。`
      )
    ) {
      return
    }

    errorMessage.value = ''
    deletingCircleId.value = circleId

    try {
      await deleteCircleMutation.mutateAsync()
    } catch (error) {
      errorMessage.value = extractStaffCircleValidationMessage(error)
    } finally {
      deletingCircleId.value = ''
    }
  }

  function openFilter() {
    draftFilterQueries.value = appliedFilterQueries.value.map((query) => ({ ...query }))
    draftFilterMode.value = appliedFilterMode.value
    syncNextFilterId()
    isFilterOpen.value = true
  }

  function closeFilter() {
    isFilterOpen.value = false
  }

  function handleAddFilter(keyName: string) {
    if (!isStaffCircleFilterKey(keyName)) {
      return
    }

    draftFilterQueries.value = [
      ...draftFilterQueries.value,
      {
        id: nextFilterId.value++,
        keyName,
        operator: 'like',
        value: ''
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

  function handleFilterModeUpdate(mode: StaffFilterMode) {
    draftFilterMode.value = normalizeStaffFilterMode(mode)
  }

  function handleApplyFilters() {
    appliedFilterQueries.value = draftFilterQueries.value
      .filter((query) => isStaffCircleFilterKey(query.keyName))
      .map((query) => ({
        ...query,
        operator: normalizeStaffFilterOperator(query.operator)
      }))
    appliedFilterMode.value = normalizeStaffFilterMode(draftFilterMode.value)
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

  function syncNextFilterId() {
    const maxId = draftFilterQueries.value.reduce((max, query) => Math.max(max, query.id), 0)
    nextFilterId.value = maxId + 1
  }

  return {
    // Queries
    allCirclesQuery,
    deleteCircleMutation,

    errorMessage,
    exportUrl,

    // Filter state
    searchQuery,
    isFilterOpen,
    draftFilterMode,
    draftFilterQueries,
    filterFields,

    // Rows
    rows,
    sortedRows,
    pagedRows,
    filterActive,

    // Sorting
    sort,

    // Pagination
    pagination,

    // Handlers
    handleSort,
    handleReload,
    handleSearch,
    handleDeleteCircle,
    openFilter,
    closeFilter,
    handleAddFilter,
    handleRemoveFilter,
    handleUpdateFilter,
    handleFilterModeUpdate,
    handleApplyFilters,
    handleClearFilters
  }
}
