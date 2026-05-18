import { computed, ref, type Ref } from 'vue'
import { useStaffDataGridFilters } from '@/lib/useStaffDataGridFilters'
import type { StaffFilterMode, StaffFilterQuery } from '@/lib/staffFilterSchema'
import {
  buildStaffCirclesExportUrl,
  extractStaffCircleValidationMessage,
  useAllStaffCirclesQuery,
  useDeleteStaffCircleMutation
} from '@/features/staff/circles/api'
import {
  filterFields,
  isStaffCircleFilterKey,
  resolveCircleSortValue,
  matchesSearch,
  matchesFilterQuery,
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

export interface UseStaffCirclesAllPageOptions {
  enabled: Ref<boolean>
}

export function useStaffCirclesAllPage(options: UseStaffCirclesAllPageOptions) {
  const { enabled } = options

  const searchQuery = ref('')
  const appliedFilterMode = ref<StaffFilterMode>('and')
  const appliedFilterQueries = ref<StaffFilterQuery[]>([])

  const staffListParams = computed(() => ({
    query: searchQuery.value,
    queries: appliedFilterQueries.value,
    mode: appliedFilterMode.value
  }))

  const allCirclesQuery = useAllStaffCirclesQuery(enabled, staffListParams)

  const errorMessage = ref('')
  const exportUrl = buildStaffCirclesExportUrl()

  const rows = computed<StaffCircleRow[]>(() => allCirclesQuery.data.value ?? [])

  const dataGrid = useStaffDataGridFilters<StaffCircleRow, StaffCircleSortKey>({
    rows,
    sortKeys: staffCircleSortKeys,
    defaultSortKey: 'id',
    filterFields,
    searchQuery,
    appliedFilterMode,
    appliedFilterQueries,
    serverSideFiltering: true,
    resolveSortValue: resolveCircleSortValue,
    matchesSearch,
    matchesFilterQuery,
    isFilterKey: isStaffCircleFilterKey
  })

  const deletingCircleId = ref('')
  const deleteCircleMutation = useDeleteStaffCircleMutation(computed(() => deletingCircleId.value))

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

  function handleReload() {
    if (typeof allCirclesQuery.refetch === 'function') {
      void allCirclesQuery.refetch()
    }
  }

  return {
    allCirclesQuery,
    deleteCircleMutation,
    errorMessage,
    exportUrl,
    rows,
    searchQuery: dataGrid.searchQuery,
    isFilterOpen: dataGrid.isFilterOpen,
    draftFilterMode: dataGrid.draftFilterMode,
    draftFilterQueries: dataGrid.draftFilterQueries,
    filterFields: dataGrid.filterFields,
    sortedRows: dataGrid.sortedRows,
    pagedRows: dataGrid.pagedRows,
    filterActive: dataGrid.filterActive,
    sort: dataGrid.sort,
    pagination: dataGrid.pagination,
    handleSort: dataGrid.handleSort,
    handleReload,
    handleSearch: dataGrid.handleSearch,
    handleDeleteCircle,
    openFilter: dataGrid.openFilter,
    closeFilter: dataGrid.closeFilter,
    handleAddFilter: dataGrid.handleAddFilter,
    handleRemoveFilter: dataGrid.handleRemoveFilter,
    handleUpdateFilter: dataGrid.handleUpdateFilter,
    handleFilterModeUpdate: dataGrid.handleFilterModeUpdate,
    handleApplyFilters: dataGrid.handleApplyFilters,
    handleClearFilters: dataGrid.handleClearFilters
  }
}
