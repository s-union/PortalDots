import { z } from 'zod'

export const formStatusTabSchema = z.enum(['open', 'closed', 'all'])
export type FormStatusTab = z.infer<typeof formStatusTabSchema>

export function parseFormStatusTab(value: unknown): FormStatusTab {
  const result = formStatusTabSchema.safeParse(value)
  return result.success ? result.data : 'open'
}
