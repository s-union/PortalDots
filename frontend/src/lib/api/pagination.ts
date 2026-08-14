import * as v from 'valibot'
import { paginatedResultSchema, parseWithSchema } from '@/lib/api/schema'

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalUnfiltered?: number
}

export function parsePaginatedResult<T>(
  value: unknown,
  parseItem: (value: unknown) => T,
  label: string
): PaginatedResult<T> {
  const itemSchema = v.pipe(
    v.unknown(),
    v.transform((item) => {
      try {
        return parseItem(item)
      } catch {
        throw new Error(`Invalid ${label} item`)
      }
    })
  )

  return parseWithSchema(paginatedResultSchema(itemSchema), value, label) as PaginatedResult<T>
}
