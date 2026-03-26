import { describe, expect, it } from 'vitest'
import { formatStaffFormDateTimeLocalValue, parseStaffFormDateTimeLocalValue } from './api'

describe('staff form datetime-local helpers', () => {
  it('keeps existing seconds when the displayed minute is unchanged', () => {
    const previousValue = '2026-03-22T23:59:59Z'
    const displayedValue = formatStaffFormDateTimeLocalValue(previousValue)

    expect(parseStaffFormDateTimeLocalValue(displayedValue, previousValue)).toBe('2026-03-22T23:59:59.000Z')
  })

  it('drops to zero seconds when the minute is changed', () => {
    const previousValue = '2026-03-22T23:59:59Z'

    expect(parseStaffFormDateTimeLocalValue('2026-03-23T09:00', previousValue)).toBe('2026-03-23T00:00:00.000Z')
  })
})
