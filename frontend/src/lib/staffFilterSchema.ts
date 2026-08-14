import * as v from 'valibot'

export const staffFilterFieldTypeSchema = v.picklist(['string', 'bool'])
export const staffFilterOperatorSchema = v.picklist(['=', '!=', 'like', 'not like'])
export const staffFilterModeSchema = v.picklist(['and', 'or'])

export const staffFilterFieldSchema = v.object({
  key: v.string(),
  label: v.string(),
  type: staffFilterFieldTypeSchema
})

export const staffFilterQuerySchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  keyName: v.string(),
  operator: staffFilterOperatorSchema,
  value: v.string()
})

export type StaffFilterFieldType = v.InferOutput<typeof staffFilterFieldTypeSchema>
export type StaffFilterOperator = v.InferOutput<typeof staffFilterOperatorSchema>
export type StaffFilterMode = v.InferOutput<typeof staffFilterModeSchema>
export type StaffFilterField = v.InferOutput<typeof staffFilterFieldSchema>
export type StaffFilterQuery = v.InferOutput<typeof staffFilterQuerySchema>

export function normalizeStaffFilterOperator(value: unknown): StaffFilterOperator {
  const result = v.safeParse(staffFilterOperatorSchema, value)
  return result.success ? result.output : 'like'
}

export function normalizeStaffFilterMode(value: unknown): StaffFilterMode {
  const result = v.safeParse(staffFilterModeSchema, value)
  return result.success ? result.output : 'and'
}
