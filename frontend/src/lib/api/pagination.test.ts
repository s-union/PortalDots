import { describe, expect, it } from 'vitest'
import { parsePaginatedResult } from '@/lib/api/pagination'

interface TestItem {
  id: string
}

function parseItem(value: unknown): TestItem {
  return value as TestItem
}

describe('parsePaginatedResult', () => {
  it('parses totalUnfiltered when the producer sends it', () => {
    const result = parsePaginatedResult(
      { items: [{ id: 'a' }], page: 1, pageSize: 20, total: 1, totalUnfiltered: 42 },
      parseItem,
      'test items'
    )

    expect(result.total).toBe(1)
    expect(result.totalUnfiltered).toBe(42)
  })

  it('accepts a response without totalUnfiltered', () => {
    const result = parsePaginatedResult(
      { items: [{ id: 'a' }], page: 1, pageSize: 20, total: 1 },
      parseItem,
      'test items'
    )

    expect(result.total).toBe(1)
    expect(result.totalUnfiltered).toBeUndefined()
  })
})
