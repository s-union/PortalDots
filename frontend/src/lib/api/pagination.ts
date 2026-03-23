import { z } from 'zod'
import { paginatedResultSchema, parseWithSchema } from '@/lib/api/schema'

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export function parsePaginatedResult<T>(
  value: unknown,
  parseItem: (value: unknown) => T,
  label: string
): PaginatedResult<T> {
  const itemSchema = z.unknown().transform((item, ctx) => {
    try {
      return parseItem(item)
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid ${label} item`
      })
      return z.NEVER
    }
  })

  return parseWithSchema(paginatedResultSchema(itemSchema), value, label)
}
