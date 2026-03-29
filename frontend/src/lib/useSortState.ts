import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

export type SortDirection = 'asc' | 'desc'

export interface UseSortStateOptions<K extends string> {
  /** Initial sort key (default: first key if not provided) */
  initialSortKey?: K
  /** Initial sort direction (default: 'asc') */
  initialSortDirection?: SortDirection
}

export interface UseSortStateReturn<K extends string> {
  /** Current sort key */
  sortKey: ShallowRef<K>
  /** Current sort direction */
  sortDirection: Ref<SortDirection>
  /**
   * Toggle sort for a given key.
   * - If same key: toggles direction (asc ↔ desc)
   * - If different key: switches to new key with 'asc' direction
   *
   * @param nextKey - The key to sort by
   * @returns true if sort changed, false if key was invalid
   */
  toggleSort: (nextKey: K) => boolean
}

/**
 * Composable for managing sort state with type-safe sort keys.
 *
 * @param defaultSortKey - Default sort key to use
 * @param options - Optional initial sort key and direction
 */
export function useSortState<K extends string>(
  defaultSortKey: K,
  options: UseSortStateOptions<K> = {}
): UseSortStateReturn<K> {
  const initialSortKey: K = options.initialSortKey ?? defaultSortKey
  const initialSortDirection: SortDirection = options.initialSortDirection ?? 'asc'

  const sortKey: ShallowRef<K> = shallowRef(initialSortKey)
  const sortDirection = ref<SortDirection>(initialSortDirection)

  function toggleSort(nextKey: K): boolean {
    if (sortKey.value === nextKey) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      return true
    }

    sortKey.value = nextKey
    sortDirection.value = 'asc'
    return true
  }

  return {
    sortKey,
    sortDirection,
    toggleSort
  }
}

/**
 * Creates a type guard function for validating sort keys.
 *
 * @param validKeys - Array of valid sort key strings
 * @returns Type guard function
 */
export function createSortKeyGuard<K extends string>(validKeys: readonly K[]) {
  return (value: string): value is K => {
    return (validKeys as readonly string[]).includes(value)
  }
}
