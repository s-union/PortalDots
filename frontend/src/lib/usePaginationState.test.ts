import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { usePaginationState } from './usePaginationState'

describe('usePaginationState', () => {
  describe('initialization', () => {
    it('initializes with default values', () => {
      const total = ref(100)
      const { page, pageSize, totalPages } = usePaginationState(total)

      expect(page.value).toBe(1)
      expect(pageSize.value).toBe(25)
      expect(totalPages.value).toBe(4)
    })

    it('respects initialPage option', () => {
      const total = ref(100)
      const { page } = usePaginationState(total, { initialPage: 3 })

      expect(page.value).toBe(3)
    })

    it('respects initialPageSize option', () => {
      const total = ref(100)
      const { pageSize, totalPages } = usePaginationState(total, { initialPageSize: 10 })

      expect(pageSize.value).toBe(10)
      expect(totalPages.value).toBe(10)
    })

    it('accepts a getter function for reactive total', () => {
      const totalValue = ref(50)
      const { totalPages } = usePaginationState(() => totalValue.value)

      expect(totalPages.value).toBe(2)

      totalValue.value = 100
      expect(totalPages.value).toBe(4)
    })
  })

  describe('totalPages computation', () => {
    it('computes total pages correctly', () => {
      const total = ref(100)
      const { totalPages } = usePaginationState(total, { initialPageSize: 25 })

      expect(totalPages.value).toBe(4)
    })

    it('rounds up for partial pages', () => {
      const total = ref(101)
      const { totalPages } = usePaginationState(total, { initialPageSize: 25 })

      expect(totalPages.value).toBe(5)
    })

    it('returns 1 for zero total', () => {
      const total = ref(0)
      const { totalPages } = usePaginationState(total)

      expect(totalPages.value).toBe(1)
    })

    it('updates when total changes', () => {
      const total = ref(50)
      const { totalPages } = usePaginationState(total, { initialPageSize: 10 })

      expect(totalPages.value).toBe(5)

      total.value = 100
      expect(totalPages.value).toBe(10)
    })

    it('updates when pageSize changes', () => {
      const total = ref(100)
      const { pageSize, totalPages } = usePaginationState(total, { initialPageSize: 10 })

      expect(totalPages.value).toBe(10)

      pageSize.value = 25
      expect(totalPages.value).toBe(4)
    })
  })

  describe('setFirstPage', () => {
    it('sets page to 1', () => {
      const total = ref(100)
      const { page, setFirstPage } = usePaginationState(total, { initialPage: 5 })

      setFirstPage()
      expect(page.value).toBe(1)
    })
  })

  describe('setPrevPage', () => {
    it('decrements page by 1', () => {
      const total = ref(100)
      const { page, setPrevPage } = usePaginationState(total, { initialPage: 3 })

      setPrevPage()
      expect(page.value).toBe(2)
    })

    it('clamps to 1', () => {
      const total = ref(100)
      const { page, setPrevPage } = usePaginationState(total, { initialPage: 1 })

      setPrevPage()
      expect(page.value).toBe(1)
    })
  })

  describe('setNextPage', () => {
    it('increments page by 1', () => {
      const total = ref(100)
      const { page, setNextPage } = usePaginationState(total, { initialPage: 2, initialPageSize: 25 })

      setNextPage()
      expect(page.value).toBe(3)
    })

    it('clamps to totalPages', () => {
      const total = ref(100)
      const { page, setNextPage } = usePaginationState(total, { initialPage: 4, initialPageSize: 25 })

      setNextPage()
      expect(page.value).toBe(4)
    })
  })

  describe('setLastPage', () => {
    it('sets page to totalPages', () => {
      const total = ref(100)
      const { page, setLastPage } = usePaginationState(total, { initialPage: 1, initialPageSize: 25 })

      setLastPage()
      expect(page.value).toBe(4)
    })

    it('handles single page', () => {
      const total = ref(10)
      const { page, setLastPage } = usePaginationState(total, { initialPage: 1, initialPageSize: 25 })

      setLastPage()
      expect(page.value).toBe(1)
    })
  })

  describe('setPageSize', () => {
    it('updates pageSize', () => {
      const total = ref(100)
      const { pageSize, setPageSize } = usePaginationState(total)

      setPageSize(50)
      expect(pageSize.value).toBe(50)
    })

    it('resets page to 1', () => {
      const total = ref(100)
      const { page, setPageSize } = usePaginationState(total, { initialPage: 3 })

      setPageSize(50)
      expect(page.value).toBe(1)
    })
  })

  describe('resetPage', () => {
    it('resets page to 1', () => {
      const total = ref(100)
      const { page, resetPage } = usePaginationState(total, { initialPage: 5 })

      resetPage()
      expect(page.value).toBe(1)
    })
  })
})
