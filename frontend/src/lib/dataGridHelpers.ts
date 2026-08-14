import * as v from 'valibot'
import type { StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'

export function resolveRowId(row: StaffDataGridRow): string {
  return String(row.id ?? '')
}

export function resolveText(value: unknown): string {
  if (typeof value !== 'string') {
    return '-'
  }
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : '-'
}

const tagsSchema = v.array(v.string())

export function resolveTags(value: unknown): string[] {
  const result = v.safeParse(tagsSchema, value)
  return result.success ? result.output : []
}
