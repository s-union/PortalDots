import { computed, ref, watch, type Ref } from 'vue'
import {
  normalizeStaffFilterMode,
  normalizeStaffFilterOperator,
  type StaffFilterField,
  type StaffFilterMode,
  type StaffFilterQuery,
  type StaffFilterOperator
} from '@/lib/staffFilterSchema'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'

export interface UseStaffDataGridFiltersOptions<TRow, TSortKey extends string> {
  rows: Ref<TRow[]>
  sortKeys: readonly TSortKey[]
  defaultSortKey: TSortKey
  filterFields: StaffFilterField[]
  resolveSortValue: (row: TRow, key: TSortKey) => string
  matchesSearch: (row: TRow, normalizedSearch: string) => boolean
  matchesFilterQuery: (row: TRow, query: StaffFilterQuery) => boolean
  isFilterKey: (key: string) => boolean
}

export function useStaffDataGridFilters<TRow, TSortKey extends string>(
  options: UseStaffDataGridFiltersOptions<TRow, TSortKey>
) {
  const {
    rows,
    sortKeys,
    defaultSortKey,
    filterFields,
    resolveSortValue,
    matchesSearch,
    matchesFilterQuery,
    isFilterKey
  } = options

  const isSortKey = createSortKeyGuard(sortKeys)

  // Filter state
  const searchQuery = ref('')
  const isFilterOpen = ref(false)
  const nextFilterId = ref(1)
  const appliedFilterMode = ref<StaffFilterMode>('and')
  const appliedFilterQueries = ref<StaffFilterQuery[]>([])
  const draftFilterMode = ref<StaffFilterMode>('and')
  const draftFilterQueries = ref<StaffFilterQuery[]>([])
  const defaultFilterOperator: StaffFilterOperator = 'like'

  // Filtered rows
  const filteredRows = computed<TRow[]>(() => {
    const normalizedSearch = searchQuery.value.trim().toLowerCase()
    const queries = appliedFilterQueries.value
    const mode = appliedFilterMode.value

    return rows.value.filter((row) => {
      if (normalizedSearch.length > 0 && !matchesSearch(row, normalizedSearch)) {
        return false
      }

      if (queries.length === 0) {
        return true
      }

      if (mode === 'or') {
        return queries.some((query) => matchesFilterQuery(row, query))
      }

      return queries.every((query) => matchesFilterQuery(row, query))
    })
  })

  // Sorting
  const sort = useSortState<TSortKey>(defaultSortKey)

  const sortedRows = computed<TRow[]>(() => {
    const cloned = [...filteredRows.value]
    const direction = sort.sortDirection.value === 'asc' ? 1 : -1
    const key = sort.sortKey.value

    cloned.sort((left, right) => {
      const leftValue = resolveSortValue(left, key)
      const rightValue = resolveSortValue(right, key)

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

  const pagedRows = computed<TRow[]>(() => {
    const start = (pagination.page.value - 1) * pagination.pageSize.value
    const end = start + pagination.pageSize.value
    return sortedRows.value.slice(start, end)
  })

  const filterActive = computed(() => searchQuery.value.trim().length > 0 || appliedFilterQueries.value.length > 0)

  // Pagination auto-adjust
  watch(
    () => [sortedRows.value.length, pagination.pageSize.value] as const,
    ([total, pageSize]) => {
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      if (pagination.page.value > totalPages) {
        pagination.page.value = totalPages
      }
    }
  )

  // Handlers
  function handleSort(nextKey: string) {
    if (!isSortKey(nextKey)) {
      return
    }
    sort.toggleSort(nextKey)
  }

  function handleSearch() {
    pagination.resetPage()
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
    if (!isFilterKey(keyName)) {
      return
    }

    draftFilterQueries.value = [
      ...draftFilterQueries.value,
      {
        id: nextFilterId.value++,
        keyName,
        operator: defaultFilterOperator,
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
      return { ...query, ...patch }
    })
  }

  function handleFilterModeUpdate(mode: StaffFilterMode) {
    draftFilterMode.value = normalizeStaffFilterMode(mode)
  }

  function handleApplyFilters() {
    appliedFilterQueries.value = draftFilterQueries.value
      .filter((query) => isFilterKey(query.keyName))
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
    // Filter state
    searchQuery,
    isFilterOpen,
    draftFilterMode,
    draftFilterQueries,
    filterFields,

    // Rows
    filteredRows,
    sortedRows,
    pagedRows,
    filterActive,

    // Sorting
    sort,

    // Pagination
    pagination,

    // Handlers
    handleSort,
    handleSearch,
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
