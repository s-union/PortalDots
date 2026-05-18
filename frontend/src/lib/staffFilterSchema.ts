import { z } from 'zod'

export const staffFilterFieldTypeSchema = z.enum(['string', 'bool'])
export const staffFilterOperatorSchema = z.enum(['=', '!=', 'like', 'not like'])
export const staffFilterModeSchema = z.enum(['and', 'or'])

export const staffFilterFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: staffFilterFieldTypeSchema
})

export const staffFilterQuerySchema = z.object({
  id: z.number().int(),
  keyName: z.string(),
  operator: staffFilterOperatorSchema,
  value: z.string()
})

export type StaffFilterFieldType = z.infer<typeof staffFilterFieldTypeSchema>
export type StaffFilterOperator = z.infer<typeof staffFilterOperatorSchema>
export type StaffFilterMode = z.infer<typeof staffFilterModeSchema>
export type StaffFilterField = z.infer<typeof staffFilterFieldSchema>
export type StaffFilterQuery = z.infer<typeof staffFilterQuerySchema>

export function normalizeStaffFilterOperator(value: unknown): StaffFilterOperator {
  const result = staffFilterOperatorSchema.safeParse(value)
  return result.success ? result.data : 'like'
}

export function normalizeStaffFilterMode(value: unknown): StaffFilterMode {
  const result = staffFilterModeSchema.safeParse(value)
  return result.success ? result.data : 'and'
}
