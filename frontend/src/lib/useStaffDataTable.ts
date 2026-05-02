import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { compareString } from './compareString'

/**
 * Creates an ordered list and a mapping of item IDs to display order indices.
 * Items are sorted by createdAt (ascending) for deterministic ordering.
 */
export function useOrderedItems<T extends { id: string; createdAt: string }>(items: MaybeRefOrGetter<T[]>) {
  const orderedItems = computed(() =>
    [...toValue(items)].sort((left, right) => compareString(left.createdAt, right.createdAt))
  )

  const orderMap = computed(() => {
    const order = new Map<string, number>()
    orderedItems.value.forEach((item, index) => {
      order.set(item.id, index + 1)
    })
    return order
  })

  return { orderedItems, orderMap }
}
