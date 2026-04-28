import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { buildApiUrl, createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, staffUserSchema } from '@/lib/api/schema'
import { parsePaginatedResult, type PaginatedResult } from '@/lib/api/pagination'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { fetchSessionBootstrap } from '@/features/session/api'
import { useSessionStore } from '@/features/session/store'

export const manageableRoles = [
  'participant',
  'staff',
  'content_manager',
  'forms_manager',
  'circle_manager',
  'user_manager',
  'admin'
] as const

export const roleDisplayNames: Record<string, string> = {
  participant: '参加者',
  staff: 'スタッフ',
  content_manager: 'コンテンツ管理',
  forms_manager: '申請管理',
  circle_manager: '企画管理',
  user_manager: 'ユーザー管理',
  admin: '管理者'
}

export const roleDescriptions: Record<string, string> = {
  participant: '企画への参加登録ができます。',
  staff: '互換性維持のための既存ロールです。',
  content_manager: 'お知らせ・配布資料の管理ができます。',
  forms_manager: '申請フォームの管理ができます。',
  circle_manager: '企画情報の管理ができます。',
  user_manager: 'ユーザー情報の管理ができます。',
  admin: 'スタッフモードを含む全機能を利用できます。'
}

export function getRoleDisplayName(role: string): string {
  return roleDisplayNames[role] ?? role
}

export interface StaffUser {
  id: string
  lastName: string
  lastNameReading: string
  firstName: string
  firstNameReading: string
  displayName: string
  loginIds: string[]
  contactEmail: string
  univemail: string
  phoneNumber: string
  roles: string[]
  isVerified: boolean
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateStaffUserPayload {
  userId: string
  lastName: string
  lastNameReading: string
  firstName: string
  firstNameReading: string
  displayName: string
  loginIds: string[]
  contactEmail: string
  phoneNumber: string
}

interface UpdateStaffUserRolesPayload {
  userId: string
  roles: string[]
}

export type StaffUserFilterMode = 'and' | 'or'
export type StaffUserFilterOperator = '=' | '!=' | 'like' | 'not like'
export type StaffUserFilterKey =
  | 'id'
  | 'lastName'
  | 'firstName'
  | 'loginIds'
  | 'contactEmail'
  | 'univemail'
  | 'phoneNumber'
  | 'createdAt'
  | 'updatedAt'
  | 'isStaff'
  | 'isAdmin'
  | 'isEmailVerified'
  | 'isVerified'
export type StaffUserSortKey =
  | 'id'
  | 'lastName'
  | 'firstName'
  | 'loginIds'
  | 'contactEmail'
  | 'univemail'
  | 'phoneNumber'
  | 'createdAt'
  | 'updatedAt'
  | 'isStaff'
  | 'isAdmin'
  | 'isEmailVerified'
  | 'isVerified'

export interface StaffUserFilterQuery {
  keyName: StaffUserFilterKey
  operator: StaffUserFilterOperator
  value: string
}

interface StaffUsersPagination {
  page: number
  pageSize: number
  query?: string
  sortKey?: StaffUserSortKey
  sortDirection?: 'asc' | 'desc'
  queries?: StaffUserFilterQuery[]
  mode?: StaffUserFilterMode
}

function serializeFilterQueries(queries: StaffUserFilterQuery[]) {
  return JSON.stringify(
    queries.map((query) => ({
      key_name: query.keyName,
      operator: query.operator,
      value: query.value
    }))
  )
}

function buildStaffUsersQueryParams(pagination: StaffUsersPagination) {
  const trimmedQuery = pagination.query?.trim() ?? ''

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(trimmedQuery !== '' ? { query: trimmedQuery } : {}),
    ...(pagination.sortKey ? { sortKey: pagination.sortKey } : {}),
    ...(pagination.sortDirection ? { sortDirection: pagination.sortDirection } : {}),
    ...(pagination.queries && pagination.queries.length > 0
      ? {
          queries: serializeFilterQueries(pagination.queries),
          mode: pagination.mode ?? 'and'
        }
      : {})
  }
}

function buildStaffUsersRequestUrl(pagination: StaffUsersPagination) {
  const params = new URLSearchParams()
  const query = buildStaffUsersQueryParams(pagination)

  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))

  if (query.query) {
    params.set('query', query.query)
  }
  if (query.sortKey) {
    params.set('sortKey', query.sortKey)
  }
  if (query.sortDirection) {
    params.set('sortDirection', query.sortDirection)
  }
  if (query.queries) {
    params.set('queries', query.queries)
  }
  if (query.mode) {
    params.set('mode', query.mode)
  }

  return buildApiUrl(`/staff/users?${params.toString()}`)
}

export async function fetchStaffUsers(pagination: StaffUsersPagination) {
  const response = await fetch(buildStaffUsersRequestUrl(pagination), {
    method: 'GET',
    headers: createJsonHeaders(),
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch staff users')
  }

  const data = await response.json()
  return parsePaginatedResult(data, parseStaffUser, 'staff users')
}

export async function fetchStaffUser(userId: string) {
  return $api.queryData(
    'get',
    '/staff/users/{userID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          userID: userId
        }
      }
    },
    parseStaffUser,
    {
      errorMessage: 'Failed to fetch staff user'
    }
  )
}

export async function updateStaffUser(payload: UpdateStaffUserPayload, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/users/{userID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          userID: payload.userId
        }
      },
      body: {
        lastName: payload.lastName,
        lastNameReading: payload.lastNameReading,
        firstName: payload.firstName,
        firstNameReading: payload.firstNameReading,
        displayName: payload.displayName,
        loginIds: payload.loginIds,
        contactEmail: payload.contactEmail,
        phoneNumber: payload.phoneNumber
      }
    },
    parseStaffUser,
    {
      errorMessage: 'Failed to update staff user',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff user')
      }
    }
  )
}

export async function updateStaffUserRoles(payload: UpdateStaffUserRolesPayload, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/users/{userID}/roles',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          userID: payload.userId
        }
      },
      body: {
        roles: payload.roles
      }
    },
    parseStaffUser,
    {
      errorMessage: 'Failed to update staff user roles',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff user')
      }
    }
  )
}

export async function verifyStaffUser(userId: string, csrfToken: string) {
  return $api.mutationData(
    'patch',
    '/staff/users/{userID}/verify',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          userID: userId
        }
      }
    },
    parseStaffUser,
    {
      errorMessage: 'Failed to verify staff user',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff user')
      }
    }
  )
}

export async function deleteStaffUser(userId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/users/{userID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          userID: userId
        }
      }
    },
    {
      errorMessage: 'Failed to delete staff user',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff user')
      }
    }
  )
}

export function useStaffUsersQuery(
  enabled: MaybeRefOrGetter<boolean>,
  pagination: MaybeRefOrGetter<StaffUsersPagination>
) {
  return useQuery(
    computed(() => ({
      queryKey: ['staff', 'users', toValue(pagination)],
      queryFn: async () => fetchStaffUsers(toValue(pagination)),
      enabled: toValue(enabled),
      retry: false
    }))
  )
}

export function useStaffUserDetailQuery(userId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/users/{userID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          userID: toValue(userId)
        }
      }
    }),
    parseStaffUser,
    {
      queryKey: computed(() => ['staff', 'users', 'detail', toValue(userId)]),
      enabled: computed(() => toValue(enabled) && toValue(userId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff user'
    }
  )
}

export function useUpdateStaffUserMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: UpdateStaffUserPayload) => updateStaffUser(payload, sessionStore.csrfToken),
    onSuccess: async (updatedUser) => {
      await hydrateUserRelatedQueries(queryClient, sessionStore, updatedUser)
    }
  })
}

export function useUpdateStaffUserRolesMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: UpdateStaffUserRolesPayload) => updateStaffUserRoles(payload, sessionStore.csrfToken),
    onSuccess: async (updatedUser) => {
      await hydrateUserRelatedQueries(queryClient, sessionStore, updatedUser)
    }
  })
}

export function useVerifyStaffUserMutation(userId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => verifyStaffUser(toValue(userId), sessionStore.csrfToken),
    onSuccess: async (updatedUser) => {
      await hydrateUserRelatedQueries(queryClient, sessionStore, updatedUser)
    }
  })
}

export function useDeleteStaffUserMutation(userId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => deleteStaffUser(toValue(userId), sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'users'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'users', 'detail', toValue(userId)]
        }),
        queryClient.invalidateQueries({ queryKey: ['session', 'bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'status'] })
      ])
    }
  })
}

export function createEditableRoles(initialRoles: string[]) {
  return ref<string[]>([...initialRoles])
}

export function createEditableLoginIds(initialLoginIds: string[]) {
  return ref(formatStaffUserLoginIds(initialLoginIds))
}

export function normalizeSelectedRoles(roles: string[]) {
  return manageableRoles.filter((role) => roles.includes(role))
}

export function parseStaffUserLoginIds(value: string) {
  return [
    ...new Set(
      value
        .split(/[,\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ]
}

export function formatStaffUserLoginIds(loginIds: string[]) {
  return loginIds.join('\n')
}

export function buildStaffUsersExportUrl() {
  return buildApiUrl('/staff/users/export')
}

export function extractStaffUserValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'ユーザー操作に失敗しました。')
}

async function hydrateUserRelatedQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  sessionStore: ReturnType<typeof useSessionStore>,
  updatedUser: StaffUser
) {
  queryClient.setQueryData(['staff', 'users', 'detail', updatedUser.id], updatedUser)

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['staff', 'users'] }),
    queryClient.invalidateQueries({ queryKey: ['staff', 'users', 'detail', updatedUser.id] }),
    queryClient.invalidateQueries({ queryKey: ['session', 'bootstrap'] }),
    queryClient.invalidateQueries({ queryKey: ['staff', 'status'] })
  ])

  const session = await fetchSessionBootstrap()
  sessionStore.hydrate(session)
  queryClient.setQueryData(['session', 'bootstrap'], session)
}

function parseStaffUser(value: unknown): StaffUser {
  return parseWithSchema(staffUserSchema, value, 'staff user')
}

export type StaffUserPage = PaginatedResult<StaffUser>
