import { toValue, type MaybeRefOrGetter } from 'vue'
import type { StaffFilterMode, StaffFilterQuery } from '@/lib/staffFilterSchema'

export interface StaffListQueryParams {
  query?: string
  queries?: StaffFilterQuery[]
  mode?: StaffFilterMode
}

export type StaffListQueryParamsInput = MaybeRefOrGetter<StaffListQueryParams | undefined>

export function buildStaffListQueryParams(params: StaffListQueryParams | undefined) {
  const query: Record<string, string> = {}
  const normalizedQuery = params?.query?.trim() ?? ''
  const queries = params?.queries ?? []

  if (normalizedQuery !== '') {
    query.query = normalizedQuery
  }
  if (queries.length > 0) {
    query.queries = JSON.stringify(
      queries.map((item) => ({
        key_name: item.keyName,
        operator: item.operator,
        value: item.value
      }))
    )
    query.mode = params?.mode ?? 'and'
  }

  return Object.keys(query).length === 0 ? undefined : query
}

export function resolveStaffListQueryParams(params: StaffListQueryParamsInput) {
  return buildStaffListQueryParams(toValue(params))
}

export function buildStaffListRequestParams(params: StaffListQueryParamsInput) {
  const query = resolveStaffListQueryParams(params)
  return query === undefined ? {} : { params: { query } }
}
