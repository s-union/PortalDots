import { computed, ref, watch, type Ref } from 'vue'
import type { StaffFilterMode, StaffFilterQuery, StaffFilterOperator } from '@/components/staff/StaffFilterDrawer.vue'
import {
  buildStaffCirclesExportUrl,
  extractStaffCircleValidationMessage,
  useAllStaffCirclesQuery,
  useCreateStaffCircleMutation,
  useDeleteStaffCircleMutation,
  useStaffCircleForm
} from '@/features/staff/circles/api'
import { useStaffPlacesQuery } from '@/features/staff/masters/places'
import { useStaffParticipationTypesQuery } from '@/features/staff/participation-types/api'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'
import {
  filterFields,
  isStaffCircleFilterKey,
  matchesFilterQuery,
  matchesSearch,
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
const isStaffCircleSortKey = createSortKeyGuard(staffCircleSortKeys)

export interface UseStaffCirclesAllPageOptions {
  enabled: Ref<boolean>
}

export function useStaffCirclesAllPage(options: UseStaffCirclesAllPageOptions) {
  const { enabled } = options

  // Queries
  const allCirclesQuery = useAllStaffCirclesQuery(enabled)
  const participationTypesQuery = useStaffParticipationTypesQuery(enabled)
  const placesQuery = useStaffPlacesQuery(enabled)

  // Mutations
  const createCircleMutation = useCreateStaffCircleMutation()
  const deletingCircleId = ref('')
  const deleteCircleMutation = useDeleteStaffCircleMutation(computed(() => deletingCircleId.value))

  // Form state
  const form = useStaffCircleForm()
  const errorMessage = ref('')
  const exportUrl = buildStaffCirclesExportUrl()

  // Filter state
  const searchQuery = ref('')
  const isFilterOpen = ref(false)
  const nextFilterId = ref(1)
  const appliedFilterMode = ref<StaffFilterMode>('and')
  const appliedFilterQueries = ref<StaffFilterQuery[]>([])
  const draftFilterMode = ref<StaffFilterMode>('and')
  const draftFilterQueries = ref<StaffFilterQuery[]>([])

  // Computed rows
  const rows = computed<StaffCircleRow[]>(() => allCirclesQuery.data.value ?? [])

  const filteredRows = computed<StaffCircleRow[]>(() => {
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
  async function handleCreateCircle() {
    errorMessage.value = ''

    try {
      await createCircleMutation.mutateAsync({
        name: form.value.name,
        nameYomi: form.value.nameYomi,
        groupName: form.value.groupName,
        groupNameYomi: form.value.groupNameYomi,
        participationTypeId: form.value.participationTypeId,
        notes: form.value.notes,
        status: form.value.status,
        statusReason: form.value.statusReason,
        placeIds: form.value.placeIds
      })
      resetForm()
    } catch (error) {
      errorMessage.value = extractStaffCircleValidationMessage(error)
    }
  }

  function resetForm() {
    form.value = {
      name: '',
      nameYomi: '',
      groupName: '',
      groupNameYomi: '',
      participationTypeId: '',
      notes: '',
      status: 'pending',
      statusReason: '',
      placeIds: []
    }
  }

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
    draftFilterMode.value = mode
  }

  function handleApplyFilters() {
    appliedFilterQueries.value = draftFilterQueries.value
      .filter((query) => isStaffCircleFilterKey(query.keyName))
      .map((query) => ({
        ...query,
        operator: normalizeFilterOperator(query.operator)
      }))
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

  function syncNextFilterId() {
    const maxId = draftFilterQueries.value.reduce((max, query) => Math.max(max, query.id), 0)
    nextFilterId.value = maxId + 1
  }

  function openCreateCircleCard() {
    if (typeof document === 'undefined') {
      return
    }
    const target = document.getElementById('create-circle-card')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function normalizeFilterOperator(operator: StaffFilterOperator): StaffFilterOperator {
    if (operator === '=' || operator === '!=' || operator === 'not like') {
      return operator
    }
    return 'like'
  }

  return {
    // Queries
    allCirclesQuery,
    participationTypesQuery,
    placesQuery,
    createCircleMutation,
    deleteCircleMutation,

    // Form state
    form,
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
    handleCreateCircle,
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
    handleClearFilters,
    openCreateCircleCard
  }
}
