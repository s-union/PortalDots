import { describe, expect, it } from 'vitest'
import { createSortKeyGuard, useSortState } from './useSortState'

describe('useSortState', () => {
  describe('initialization', () => {
    it('initializes with default sort key and direction', () => {
      const { sortKey, sortDirection } = useSortState('id')

      expect(sortKey.value).toBe('id')
      expect(sortDirection.value).toBe('asc')
    })

    it('respects initialSortKey option', () => {
      const { sortKey } = useSortState('id', { initialSortKey: 'name' })

      expect(sortKey.value).toBe('name')
    })

    it('respects initialSortDirection option', () => {
      const { sortDirection } = useSortState('id', { initialSortDirection: 'desc' })

      expect(sortDirection.value).toBe('desc')
    })

    it('respects both initial options', () => {
      const { sortKey, sortDirection } = useSortState('id', {
        initialSortKey: 'name',
        initialSortDirection: 'desc'
      })

      expect(sortKey.value).toBe('name')
      expect(sortDirection.value).toBe('desc')
    })
  })

  describe('toggleSort', () => {
    it('toggles direction when same key is provided', () => {
      const { sortKey, sortDirection, toggleSort } = useSortState('id')

      expect(sortDirection.value).toBe('asc')

      toggleSort('id')
      expect(sortKey.value).toBe('id')
      expect(sortDirection.value).toBe('desc')

      toggleSort('id')
      expect(sortKey.value).toBe('id')
      expect(sortDirection.value).toBe('asc')
    })

    it('changes to new key with asc direction', () => {
      const { sortKey, sortDirection, toggleSort } = useSortState('id')

      toggleSort('id') // Now desc
      expect(sortDirection.value).toBe('desc')

      toggleSort('name')
      expect(sortKey.value).toBe('name')
      expect(sortDirection.value).toBe('asc')
    })

    it('returns true when sort changes', () => {
      const { toggleSort } = useSortState('id')

      expect(toggleSort('id')).toBe(true)
      expect(toggleSort('name')).toBe(true)
    })

    it('preserves type safety with generic keys', () => {
      type SortKey = 'id' | 'name' | 'date'
      const { sortKey, toggleSort } = useSortState<SortKey>('id')

      toggleSort('name')
      expect(sortKey.value).toBe('name')

      toggleSort('date')
      expect(sortKey.value).toBe('date')
    })
  })
})

describe('createSortKeyGuard', () => {
  it('creates a type guard for valid keys', () => {
    const validKeys = ['id', 'name', 'date'] as const
    const isValidKey = createSortKeyGuard(validKeys)

    expect(isValidKey('id')).toBe(true)
    expect(isValidKey('name')).toBe(true)
    expect(isValidKey('date')).toBe(true)
  })

  it('rejects invalid keys', () => {
    const validKeys = ['id', 'name', 'date'] as const
    const isValidKey = createSortKeyGuard(validKeys)

    expect(isValidKey('invalid')).toBe(false)
    expect(isValidKey('')).toBe(false)
    expect(isValidKey('ID')).toBe(false)
  })

  it('works with single key', () => {
    const validKeys = ['only'] as const
    const isValidKey = createSortKeyGuard(validKeys)

    expect(isValidKey('only')).toBe(true)
    expect(isValidKey('other')).toBe(false)
  })
})
