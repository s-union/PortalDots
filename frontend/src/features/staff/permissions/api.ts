import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { parsePaginatedResult, type PaginatedResult } from '@/lib/api/pagination'
import { parseWithSchema, staffPermissionDetailSchema, staffPermissionUserSummarySchema } from '@/lib/api/schema'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

export interface StaffPermissionDefinition {
  name: string
  group: string
  displayName: string
  shortName: string
  description: string
}

export interface StaffPermissionUserSummary {
  id: string
  displayName: string
  loginIds: string[]
  roles: string[]
  permissions: StaffPermissionDefinition[]
  isEditable: boolean
}

export interface StaffPermissionDetail {
  user: StaffPermissionUserSummary
  definedPermissions: StaffPermissionDefinition[]
  assignedPermissionNames: string[]
}

interface StaffPermissionsPagination {
  page: number
  pageSize: number
}

interface UpdateStaffPermissionsPayload {
  userId: string
  permissions: string[]
}

export async function fetchStaffPermissions(pagination: StaffPermissionsPagination) {
  return $api.queryData(
    'get',
    '/staff/permissions',
    {
      headers: createJsonHeaders(),
      params: {
        query: {
          page: pagination.page,
          pageSize: pagination.pageSize
        }
      }
    },
    (value) => parsePaginatedResult(value, parseStaffPermissionUserSummary, 'staff permissions'),
    {
      errorMessage: 'Failed to fetch staff permissions'
    }
  )
}

export async function fetchStaffPermissionDetail(userId: string) {
  return $api.queryData(
    'get',
    '/staff/permissions/{userID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          userID: userId
        }
      }
    },
    parseStaffPermissionDetail,
    {
      errorMessage: 'Failed to fetch staff permission detail'
    }
  )
}

export async function updateStaffPermissions(payload: UpdateStaffPermissionsPayload, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/permissions/{userID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          userID: payload.userId
        }
      },
      body: {
        permissions: payload.permissions
      }
    },
    parseStaffPermissionDetail,
    {
      errorMessage: 'Failed to update staff permissions',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff permissions')
      }
    }
  )
}

export function useStaffPermissionsQuery(
  enabled: MaybeRefOrGetter<boolean>,
  pagination: MaybeRefOrGetter<StaffPermissionsPagination>
) {
  return $api.useQueryData(
    'get',
    '/staff/permissions',
    () => ({
      headers: createJsonHeaders(),
      params: {
        query: {
          page: toValue(pagination).page,
          pageSize: toValue(pagination).pageSize
        }
      }
    }),
    (value) => parsePaginatedResult(value, parseStaffPermissionUserSummary, 'staff permissions'),
    {
      queryKey: computed(() => ['staff', 'permissions', toValue(pagination)]),
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff permissions'
    }
  )
}

export function useStaffPermissionDetailQuery(userId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/permissions/{userID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          userID: toValue(userId)
        }
      }
    }),
    parseStaffPermissionDetail,
    {
      queryKey: computed(() => ['staff', 'permissions', 'detail', toValue(userId)]),
      enabled: computed(() => toValue(enabled) && toValue(userId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff permission detail'
    }
  )
}

export function useUpdateStaffPermissionsMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: UpdateStaffPermissionsPayload) =>
      updateStaffPermissions(payload, sessionStore.csrfToken),
    onSuccess: async (detail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'permissions'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'permissions', 'detail', detail.user.id]
        })
      ])
    }
  })
}

export function groupPermissionDefinitions(definitions: StaffPermissionDefinition[]) {
  const grouped = new Map<string, StaffPermissionDefinition[]>()

  for (const definition of definitions) {
    const items = grouped.get(definition.group) ?? []
    items.push(definition)
    grouped.set(definition.group, items)
  }

  return [...grouped.entries()].map(([group, items]) => ({ group, items }))
}

export function normalizeSelectedPermissions(selected: string[], definitions: StaffPermissionDefinition[]) {
  const allowed = new Set(definitions.map((definition) => definition.name))
  return [...new Set(selected.filter((permission) => allowed.has(permission)))].sort()
}

export function extractStaffPermissionsValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'スタッフ権限の更新に失敗しました。')
}

function parseStaffPermissionDetail(value: unknown): StaffPermissionDetail {
  return parseWithSchema(staffPermissionDetailSchema, value, 'staff permission detail')
}

function parseStaffPermissionUserSummary(value: unknown): StaffPermissionUserSummary {
  return parseWithSchema(staffPermissionUserSummarySchema, value, 'staff permission user')
}

export type StaffPermissionPage = PaginatedResult<StaffPermissionUserSummary>
