import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { calculateTotalPages } from './pagination'

export interface UsePaginationStateOptions {
  /** Initial page number (default: 1) */
  initialPage?: number
  /** Initial page size (default: 25) */
  initialPageSize?: number
}

export interface UsePaginationStateReturn {
  /** Current page number (1-indexed) */
  page: Ref<number>
  /** Current page size */
  pageSize: Ref<number>
  /** Total pages computed from total items and page size */
  totalPages: ComputedRef<number>
  /** Navigate to the first page */
  setFirstPage: () => void
  /** Navigate to the previous page (clamped to 1) */
  setPrevPage: () => void
  /** Navigate to the next page (clamped to totalPages) */
  setNextPage: () => void
  /** Navigate to the last page */
  setLastPage: () => void
  /** Update page size and reset to page 1 */
  setPageSize: (nextSize: number) => void
  /** Reset to page 1 (useful after search/filter/sort changes) */
  resetPage: () => void
}

/**
 * Composable for managing pagination state.
 *
 * @param totalGetter - A ref or getter function returning total item count
 * @param options - Optional initial page/pageSize configuration
 */
export function usePaginationState(
  totalGetter: Ref<number> | (() => number),
  options: UsePaginationStateOptions = {}
): UsePaginationStateReturn {
  const { initialPage = 1, initialPageSize = 25 } = options

  const page = ref(initialPage)
  const pageSize = ref(initialPageSize)

  const total = computed(() => (typeof totalGetter === 'function' ? totalGetter() : totalGetter.value))

  const totalPages = computed(() => calculateTotalPages(total.value, pageSize.value))

  function setFirstPage() {
    page.value = 1
  }

  function setPrevPage() {
    page.value = Math.max(1, page.value - 1)
  }

  function setNextPage() {
    page.value = Math.min(totalPages.value, page.value + 1)
  }

  function setLastPage() {
    page.value = totalPages.value
  }

  function setPageSize(nextSize: number) {
    pageSize.value = nextSize
    page.value = 1
  }

  function resetPage() {
    page.value = 1
  }

  return {
    page,
    pageSize,
    totalPages,
    setFirstPage,
    setPrevPage,
    setNextPage,
    setLastPage,
    setPageSize,
    resetPage
  }
}
