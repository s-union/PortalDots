import type { StaffFilterField, StaffFilterQuery } from '@/components/staff/StaffFilterDrawer.vue'

export interface StaffCircleRow {
  id: string
  name: string
  nameYomi: string
  groupName: string
  groupNameYomi: string
  participationTypeName: string
  tags: string[]
  notes: string
  submittedAt: string | null
  status: string
  places: string[]
}

export type StaffCircleSortKey =
  | 'id'
  | 'participationTypeName'
  | 'name'
  | 'nameYomi'
  | 'groupName'
  | 'groupNameYomi'
  | 'notes'
  | 'submittedAt'
  | 'status'

export const filterFields: StaffFilterField[] = [
  { key: 'id', label: '企画ID', type: 'string' },
  { key: 'participationTypeName', label: '参加種別', type: 'string' },
  { key: 'name', label: '企画名', type: 'string' },
  { key: 'nameYomi', label: '企画名(よみ)', type: 'string' },
  { key: 'groupName', label: '企画を出店する団体の名称', type: 'string' },
  { key: 'groupNameYomi', label: '企画を出店する団体の名称(よみ)', type: 'string' },
  { key: 'status', label: '受理状況', type: 'string' },
  { key: 'tags', label: 'タグ', type: 'string' },
  { key: 'places', label: '使用場所', type: 'string' }
]

export function statusTone(status: string) {
  if (status === 'approved') {
    return 'success' as const
  }
  if (status === 'rejected') {
    return 'danger' as const
  }
  return 'muted' as const
}

export function statusLabel(status: string) {
  if (status === 'approved') {
    return '受理'
  }
  if (status === 'rejected') {
    return '不受理'
  }
  return '審査中'
}

export function isStaffCircleFilterKey(value: string) {
  return filterFields.some((field) => field.key === value)
}

export function resolveCircleSortValue(circle: StaffCircleRow, key: StaffCircleSortKey) {
  if (key === 'submittedAt') {
    return circle.submittedAt ?? ''
  }
  return circle[key].toLowerCase()
}

export function matchesSearch(circle: StaffCircleRow, normalizedSearch: string) {
  const haystack = [
    circle.id,
    circle.participationTypeName,
    circle.name,
    circle.nameYomi,
    circle.groupName,
    circle.groupNameYomi,
    circle.notes,
    statusLabel(circle.status),
    circle.tags.join(' '),
    circle.places.join(' ')
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedSearch)
}

function resolveFilterValue(circle: StaffCircleRow, keyName: string) {
  if (keyName === 'tags') {
    return circle.tags.join(' ')
  }
  if (keyName === 'places') {
    return circle.places.join(' ')
  }
  if (keyName === 'status') {
    return statusLabel(circle.status)
  }
  if (keyName === 'id') {
    return circle.id
  }
  if (keyName === 'participationTypeName') {
    return circle.participationTypeName
  }
  if (keyName === 'name') {
    return circle.name
  }
  if (keyName === 'nameYomi') {
    return circle.nameYomi
  }
  if (keyName === 'groupName') {
    return circle.groupName
  }
  if (keyName === 'groupNameYomi') {
    return circle.groupNameYomi
  }
  return ''
}

export function matchesFilterQuery(circle: StaffCircleRow, query: StaffFilterQuery) {
  if (!isStaffCircleFilterKey(query.keyName)) {
    return true
  }

  const left = resolveFilterValue(circle, query.keyName).toLowerCase()
  const right = query.value.trim().toLowerCase()

  if (query.operator === '=') {
    return left === right
  }
  if (query.operator === '!=') {
    return left !== right
  }
  if (query.operator === 'not like') {
    return right === '' ? true : !left.includes(right)
  }
  return right === '' ? true : left.includes(right)
}
