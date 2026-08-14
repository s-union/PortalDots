import * as v from 'valibot'

export const formStatusTabSchema = v.picklist(['open', 'closed', 'all'])
export type FormStatusTab = v.InferOutput<typeof formStatusTabSchema>

export function parseFormStatusTab(value: unknown): FormStatusTab {
  const result = v.safeParse(formStatusTabSchema, value)
  return result.success ? result.output : 'open'
}
