import type { StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'

export function resolveRowId(row: StaffDataGridRow): string {
  return String(row.id ?? '')
}

export function resolveText(value: unknown): string {
  if (typeof value !== 'string') return '-'
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : '-'
}

export function resolveTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}
