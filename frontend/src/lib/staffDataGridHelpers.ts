import type { StaffFilterField, StaffFilterQuery } from '@/lib/staffFilterSchema'

export function createIsFilterKey(filterFields: StaffFilterField[]) {
  return (key: string): boolean => filterFields.some((f) => f.key === key)
}

export function createMatchesSearch<T>(fields: (keyof T)[]) {
  return (row: T, normalizedSearch: string): boolean =>
    fields
      .map((f) => String(row[f] ?? ''))
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
}

export function matchesFilterQueryCore(rawValue: string, query: StaffFilterQuery): boolean {
  const left = rawValue.toLowerCase()
  const right = query.value.toLowerCase()
  switch (query.operator) {
    case '=':
      return left === right
    case '!=':
      return left !== right
    case 'not like':
      return right === '' ? true : !left.includes(right)
    default:
      return right === '' ? true : left.includes(right)
  }
}
