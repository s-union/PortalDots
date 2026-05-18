import { describe, expect, it } from 'vitest'
import {
  filterFields,
  isStaffCircleFilterKey,
  matchesFilterQuery,
  matchesSearch,
  resolveCircleSortValue,
  statusLabel,
  statusTone,
  type StaffCircleRow
} from './circleFilters'

function buildCircle(overrides: Partial<StaffCircleRow> = {}): StaffCircleRow {
  return {
    id: 'circle-1',
    name: '屋台企画A',
    nameYomi: 'やたいきかくえー',
    groupName: 'Aブロック',
    groupNameYomi: 'えーぶろっく',
    participationTypeName: '模擬店',
    tags: ['飲食', '屋外'],
    notes: 'ガス機材あり',
    submittedAt: '2026-03-05T12:00:00Z',
    status: 'pending',
    places: ['第一会場', '中庭'],
    ...overrides
  }
}

describe('circleFilters', () => {
  it('exposes the expected searchable filter keys', () => {
    expect(filterFields.map((field) => field.key)).toEqual([
      'id',
      'participationTypeName',
      'name',
      'nameYomi',
      'groupName',
      'groupNameYomi',
      'status',
      'tags',
      'places'
    ])
  })

  it('maps status tone and labels', () => {
    expect(statusTone('approved')).toBe('success')
    expect(statusTone('rejected')).toBe('danger')
    expect(statusTone('pending')).toBe('muted')

    expect(statusLabel('approved')).toBe('受理')
    expect(statusLabel('rejected')).toBe('不受理')
    expect(statusLabel('pending')).toBe('審査中')
  })

  it('validates supported filter keys', () => {
    expect(isStaffCircleFilterKey('tags')).toBe(true)
    expect(isStaffCircleFilterKey('unknown')).toBe(false)
  })

  it('normalizes values for sorting', () => {
    const circle = buildCircle({ name: 'FooBar', submittedAt: null })

    expect(resolveCircleSortValue(circle, 'name')).toBe('foobar')
    expect(resolveCircleSortValue(circle, 'submittedAt')).toBe('')
  })

  it('matches search against combined human-readable values', () => {
    const circle = buildCircle({ status: 'approved' })

    expect(matchesSearch(circle, '模擬店')).toBe(true)
    expect(matchesSearch(circle, '受理')).toBe(true)
    expect(matchesSearch(circle, '第一会場')).toBe(true)
    expect(matchesSearch(circle, '見つからない文字列')).toBe(false)
  })

  it('supports exact and partial filter operators for scalar fields', () => {
    const circle = buildCircle()

    expect(matchesFilterQuery(circle, { id: 1, keyName: 'name', operator: '=', value: '屋台企画A' })).toBe(true)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'name', operator: '=', value: '屋台企画' })).toBe(false)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'name', operator: '!=', value: '展示企画B' })).toBe(true)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'name', operator: 'like', value: '企画' })).toBe(true)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'name', operator: 'not like', value: '展示' })).toBe(true)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'name', operator: 'not like', value: '屋台' })).toBe(false)
  })

  it('treats empty like/not like filters as no-op and invalid keys as allowed', () => {
    const circle = buildCircle()

    expect(matchesFilterQuery(circle, { id: 1, keyName: 'name', operator: 'like', value: '   ' })).toBe(true)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'status', operator: 'not like', value: '' })).toBe(true)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'unknown', operator: '=', value: 'anything' })).toBe(true)
  })

  it('filters derived values such as tags, places, and localized status labels', () => {
    const circle = buildCircle({ status: 'rejected' })

    expect(matchesFilterQuery(circle, { id: 1, keyName: 'tags', operator: 'like', value: '屋外' })).toBe(true)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'places', operator: 'like', value: '第一会場' })).toBe(true)
    expect(matchesFilterQuery(circle, { id: 1, keyName: 'status', operator: '=', value: '不受理' })).toBe(true)
  })
})
