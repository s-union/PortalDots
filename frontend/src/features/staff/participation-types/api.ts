import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { z } from 'zod'
import { buildApiUrl, createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, staffCircleSchema, staffParticipationTypeSchema } from '@/lib/api/schema'
import { parsePaginatedResult, type PaginatedResult } from '@/lib/api/pagination'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

export type StaffParticipationType = z.infer<typeof staffParticipationTypeSchema>
export type StaffParticipationTypeCircle = z.infer<typeof staffCircleSchema>

export interface MutateStaffParticipationTypePayload {
  name: string
  description: string
  usersCountMin: number
  usersCountMax: number
  tags: string[]
  formDescription: string
  formConfirmationMessage: string
  openAt: string
  closeAt: string
  isPublic: boolean
}

export async function fetchStaffParticipationTypes() {
  return $api.queryData(
    'get',
    '/staff/participation-types',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(staffParticipationTypeSchema.array(), value, 'participation types'),
    {
      errorMessage: 'Failed to fetch participation types'
    }
  )
}

export async function fetchStaffParticipationType(typeId: string) {
  return $api.queryData(
    'get',
    '/staff/participation-types/{typeID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          typeID: typeId
        }
      }
    },
    parseStaffParticipationType,
    {
      errorMessage: 'Failed to fetch participation type'
    }
  )
}

export async function fetchStaffParticipationTypeCircles(typeId: string, page: number, pageSize: number) {
  return $api.queryData(
    'get',
    '/staff/participation-types/{typeID}/circles',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          typeID: typeId
        },
        query: {
          page,
          pageSize
        }
      }
    },
    (value) => parsePaginatedResult(value, parseStaffParticipationTypeCircle, 'participation type circles'),
    {
      errorMessage: 'Failed to fetch participation type circles'
    }
  )
}

export async function fetchAllStaffParticipationTypeCircles(typeId: string) {
  const pageSize = 100
  let page = 1
  const allItems: StaffParticipationTypeCircle[] = []

  while (true) {
    const current = await fetchStaffParticipationTypeCircles(typeId, page, pageSize)
    allItems.push(...current.items)

    const totalPages = Math.max(1, Math.ceil(current.total / current.pageSize))
    if (page >= totalPages) {
      break
    }
    page += 1
  }

  return allItems
}

export async function createStaffParticipationType(payload: MutateStaffParticipationTypePayload, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/participation-types',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseStaffParticipationType,
    {
      errorMessage: 'Failed to create participation type',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff participation type')
      }
    }
  )
}

export async function updateStaffParticipationType(
  typeId: string,
  payload: MutateStaffParticipationTypePayload,
  csrfToken: string
) {
  return $api.mutationData(
    'put',
    '/staff/participation-types/{typeID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          typeID: typeId
        }
      },
      body: payload
    },
    parseStaffParticipationType,
    {
      errorMessage: 'Failed to update participation type',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff participation type')
      }
    }
  )
}

export async function deleteStaffParticipationType(typeId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/participation-types/{typeID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          typeID: typeId
        }
      }
    },
    {
      errorMessage: 'Failed to delete participation type'
    }
  )
}

export function useStaffParticipationTypesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/participation-types',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(staffParticipationTypeSchema.array(), value, 'participation types'),
    {
      queryKey: ['staff', 'participation-types'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch participation types'
    }
  )
}

export function useStaffParticipationTypeDetailQuery(
  typeId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>
) {
  return $api.useQueryData(
    'get',
    '/staff/participation-types/{typeID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          typeID: toValue(typeId)
        }
      }
    }),
    parseStaffParticipationType,
    {
      queryKey: computed(() => ['staff', 'participation-types', toValue(typeId)]),
      enabled: computed(() => toValue(enabled) && toValue(typeId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch participation type'
    }
  )
}

export function useStaffParticipationTypeCirclesQuery(
  typeId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>,
  page: MaybeRefOrGetter<number>,
  pageSize: MaybeRefOrGetter<number>
) {
  return $api.useQueryData(
    'get',
    '/staff/participation-types/{typeID}/circles',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          typeID: toValue(typeId)
        },
        query: {
          page: toValue(page),
          pageSize: toValue(pageSize)
        }
      }
    }),
    (value) => parsePaginatedResult(value, parseStaffParticipationTypeCircle, 'participation type circles'),
    {
      queryKey: computed(() => [
        'staff',
        'participation-types',
        toValue(typeId),
        'circles',
        toValue(page),
        toValue(pageSize)
      ]),
      enabled: computed(() => toValue(enabled) && toValue(typeId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch participation type circles'
    }
  )
}

export function useAllStaffParticipationTypeCirclesQuery(
  typeId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>
) {
  return useQuery({
    queryKey: computed(() => ['staff', 'participation-types', toValue(typeId), 'circles', 'all']),
    queryFn: () => fetchAllStaffParticipationTypeCircles(toValue(typeId)),
    enabled: computed(() => toValue(enabled) && toValue(typeId).trim().length > 0),
    retry: false
  })
}

export function useCreateStaffParticipationTypeMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffParticipationTypePayload) =>
      createStaffParticipationType(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'participation-types'] })
    }
  })
}

export function useUpdateStaffParticipationTypeMutation(typeId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffParticipationTypePayload) =>
      updateStaffParticipationType(toValue(typeId), payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'participation-types'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'participation-types', toValue(typeId)]
        })
      ])
    }
  })
}

export function useDeleteStaffParticipationTypeMutation(typeId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => deleteStaffParticipationType(toValue(typeId), sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'participation-types'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'participation-types', toValue(typeId)]
        })
      ])
    }
  })
}

export function useStaffParticipationTypeForm() {
  return ref<MutateStaffParticipationTypePayload>({
    name: '',
    description: '',
    usersCountMin: 1,
    usersCountMax: 1,
    tags: [],
    formDescription: '',
    formConfirmationMessage: '',
    openAt: '',
    closeAt: '',
    isPublic: true
  })
}

export function parseParticipationTypeTags(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function formatParticipationTypeTags(tags: string[]) {
  return tags.join('\n')
}

export function formatDateTimeLocalValue(value: string) {
  if (value.trim().length === 0) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.getFullYear()}-${padDateTimeLocalValue(date.getMonth() + 1)}-${padDateTimeLocalValue(date.getDate())}T${padDateTimeLocalValue(date.getHours())}:${padDateTimeLocalValue(date.getMinutes())}`
}

export function parseDateTimeLocalValue(value: string) {
  if (value.trim().length === 0) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString()
}

export function extractStaffParticipationTypeValidationMessage(error: unknown) {
  return extractValidationMessage(error, '参加種別の保存に失敗しました。')
}

export function buildStaffParticipationTypeCirclesExportUrl(typeId: string) {
  return buildApiUrl(`/staff/participation-types/${encodeURIComponent(typeId)}/circles/export`)
}

export function buildDeleteStaffParticipationTypeConfirmMessage() {
  return '本当にこの参加種別を削除しますか？この参加種別に紐づく企画もすべて削除されます。'
}

function parseStaffParticipationType(value: unknown): StaffParticipationType {
  return parseWithSchema(staffParticipationTypeSchema, value, 'participation type')
}

function parseStaffParticipationTypeCircle(value: unknown): StaffParticipationTypeCircle {
  return parseWithSchema(staffCircleSchema, value, 'participation type circle')
}

function padDateTimeLocalValue(value: number) {
  return String(value).padStart(2, '0')
}

export type StaffParticipationTypeCirclePage = PaginatedResult<StaffParticipationTypeCircle>
