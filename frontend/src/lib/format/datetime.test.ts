import { describe, expect, it } from 'vitest'
import { formatDateTime, formatDateTimeTable } from './datetime'

describe('datetime formatters', () => {
  it('formats ISO strings for the default UI', () => {
    expect(formatDateTime('2026-03-03T00:00:00Z')).toBe('2026年3月3日(火) 09:00')
  })

  it('formats ISO strings for staff tables', () => {
    expect(formatDateTimeTable('2026-03-03T00:00:00Z')).toBe('2026/03/03 09:00:00')
  })
})
