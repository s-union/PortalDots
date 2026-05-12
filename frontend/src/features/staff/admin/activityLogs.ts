import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { createJsonHeaders, $api, $apiSuspense } from '@/lib/api/client'
import { parsePaginatedResult, type PaginatedResult } from '@/lib/api/pagination'
import { parseWithSchema, staffActivityLogSchema } from '@/lib/api/schema'
import { resolveStaffListQueryParams, type StaffListQueryParamsInput } from '@/lib/staffListQuery'

export interface StaffActivityLog {
  id: string
  actorUserId: string
  action: string
  targetType: string
  targetId: string
  circleId: string
  summary: string
  createdAt: string
}

interface StaffActivityLogPagination {
  page: number
  pageSize: number
  query?: string
}

export async function fetchStaffActivityLogs(
  pagination: StaffActivityLogPagination,
  params?: StaffListQueryParamsInput
) {
  return $api.queryData(
    'get',
    '/staff/activity-logs',
    {
      headers: createJsonHeaders(),
      params: {
        query: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          ...resolveStaffListQueryParams({ ...toValue(params), query: pagination.query ?? toValue(params)?.query })
        }
      }
    },
    (value) => parsePaginatedResult(value, parseStaffActivityLog, 'staff activity logs'),
    {
      errorMessage: 'Failed to fetch staff activity logs'
    }
  )
}

export function useStaffActivityLogsQuery(
  enabled: MaybeRefOrGetter<boolean>,
  pagination: MaybeRefOrGetter<StaffActivityLogPagination>,
  params?: StaffListQueryParamsInput
) {
  return $api.useQueryData(
    'get',
    '/staff/activity-logs',
    () => ({
      headers: createJsonHeaders(),
      params: {
        query: {
          page: toValue(pagination).page,
          pageSize: toValue(pagination).pageSize,
          ...resolveStaffListQueryParams({
            ...toValue(params),
            query: toValue(pagination).query ?? toValue(params)?.query
          })
        }
      }
    }),
    (value) => parsePaginatedResult(value, parseStaffActivityLog, 'staff activity logs'),
    {
      queryKey: computed(() => ['staff', 'activity-logs', toValue(pagination), toValue(params)]),
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff activity logs'
    }
  )
}

export function useSuspenseStaffActivityLogsQuery(
  pagination: MaybeRefOrGetter<StaffActivityLogPagination>,
  params?: StaffListQueryParamsInput
) {
  return $apiSuspense.useSuspenseQueryData(
    'get',
    '/staff/activity-logs',
    () => ({
      headers: createJsonHeaders(),
      params: {
        query: {
          page: toValue(pagination).page,
          pageSize: toValue(pagination).pageSize,
          ...resolveStaffListQueryParams({
            ...toValue(params),
            query: toValue(pagination).query ?? toValue(params)?.query
          })
        }
      }
    }),
    (value) => parsePaginatedResult(value, parseStaffActivityLog, 'staff activity logs'),
    {
      queryKey: computed(() => ['staff', 'activity-logs', toValue(pagination), toValue(params)]),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff activity logs'
    }
  )
}

function parseStaffActivityLog(value: unknown): StaffActivityLog {
  return parseWithSchema(staffActivityLogSchema, value, 'staff activity log')
}

export type StaffActivityLogPage = PaginatedResult<StaffActivityLog>
