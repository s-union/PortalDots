import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { z } from 'zod'
import { buildApiUrl, createJsonHeaders, $api } from '@/lib/api/client'
import {
  parseWithSchema,
  staffCircleMailFormSchema,
  staffCircleSchema,
  staffManagedCircleSchema
} from '@/lib/api/schema'
import { parsePaginatedResult, type PaginatedResult } from '@/lib/api/pagination'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { fetchSessionBootstrap } from '@/features/session/api'
import { useSessionStore } from '@/features/session/store'

export type StaffCircle = z.infer<typeof staffCircleSchema>
export type StaffManagedCircle = z.infer<typeof staffManagedCircleSchema>
export type StaffCircleMailForm = z.infer<typeof staffCircleMailFormSchema>
export type StaffCircleMailRecipient = StaffCircleMailForm['recipients'][number]

export interface MutateStaffCirclePayload {
  name: string
  nameYomi: string
  groupName: string
  groupNameYomi: string
  participationTypeId: string
  notes: string
  status: 'pending' | 'approved' | 'rejected'
  statusReason: string
  placeIds: string[]
}

type UpdateStaffCirclePayload = MutateStaffCirclePayload & {
  circleId: string
}

interface SendStaffCircleMailPayload {
  circleId: string
  recipient: 'all' | 'leader'
  subject: string
  body: string
}

interface StaffCirclesPagination {
  page: number
  pageSize: number
}

export async function fetchStaffCircles(pagination: StaffCirclesPagination) {
  return $api.queryData(
    'get',
    '/staff/circles',
    {
      headers: createJsonHeaders(),
      params: {
        query: {
          page: pagination.page,
          pageSize: pagination.pageSize
        }
      }
    },
    (value) => parsePaginatedResult(value, parseStaffCircle, 'staff circles'),
    {
      errorMessage: 'Failed to fetch staff circles'
    }
  )
}

export async function fetchAllStaffCircles() {
  return $api.queryData(
    'get',
    '/staff/circles/all',
    {
      headers: createJsonHeaders()
    },
    parseStaffCircles,
    {
      errorMessage: 'Failed to fetch all staff circles'
    }
  )
}

export async function fetchManagedStaffCircles() {
  return $api.queryData(
    'get',
    '/staff/circles/managed',
    {
      headers: createJsonHeaders()
    },
    parseManagedStaffCircles,
    {
      errorMessage: 'Failed to fetch managed staff circles'
    }
  )
}

export async function fetchStaffCircle(circleId: string) {
  return $api.queryData(
    'get',
    '/staff/circles/{circleID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          circleID: circleId
        }
      }
    },
    parseStaffCircle,
    {
      errorMessage: 'Failed to fetch staff circle'
    }
  )
}

export async function fetchStaffCircleMailForm(circleId: string) {
  return $api.queryData(
    'get',
    '/staff/circles/{circleID}/email',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          circleID: circleId
        }
      }
    },
    parseStaffCircleMailForm,
    {
      errorMessage: 'Failed to fetch staff circle mail form'
    }
  )
}

export async function createStaffCircle(payload: MutateStaffCirclePayload, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/circles',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseStaffCircle,
    {
      errorMessage: 'Failed to create staff circle',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff circle')
      }
    }
  )
}

export async function updateStaffCircle(payload: UpdateStaffCirclePayload, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/circles/{circleID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          circleID: payload.circleId
        }
      },
      body: {
        name: payload.name,
        nameYomi: payload.nameYomi,
        groupName: payload.groupName,
        groupNameYomi: payload.groupNameYomi,
        participationTypeId: payload.participationTypeId,
        notes: payload.notes,
        status: payload.status,
        statusReason: payload.statusReason,
        placeIds: payload.placeIds
      }
    },
    parseStaffCircle,
    {
      errorMessage: 'Failed to update staff circle',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff circle')
      }
    }
  )
}

export async function deleteStaffCircle(circleId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/circles/{circleID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          circleID: circleId
        }
      }
    },
    {
      errorMessage: 'Failed to delete staff circle'
    }
  )
}

export async function sendStaffCircleMail(payload: SendStaffCircleMailPayload, csrfToken: string) {
  await $api.noContentMutation(
    'post',
    '/staff/circles/{circleID}/email',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          circleID: payload.circleId
        }
      },
      body: {
        recipient: payload.recipient,
        subject: payload.subject,
        body: payload.body
      }
    },
    {
      errorMessage: 'Failed to queue staff circle mail',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff circle mail')
      }
    }
  )
}

export function useStaffCirclesQuery(
  enabled: MaybeRefOrGetter<boolean>,
  pagination: MaybeRefOrGetter<StaffCirclesPagination>
) {
  return $api.useQueryData(
    'get',
    '/staff/circles',
    () => ({
      headers: createJsonHeaders(),
      params: {
        query: {
          page: toValue(pagination).page,
          pageSize: toValue(pagination).pageSize
        }
      }
    }),
    (value) => parsePaginatedResult(value, parseStaffCircle, 'staff circles'),
    {
      queryKey: computed(() => ['staff', 'circles', toValue(pagination)]),
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff circles'
    }
  )
}

export function useAllStaffCirclesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/circles/all',
    {
      headers: createJsonHeaders()
    },
    parseStaffCircles,
    {
      queryKey: ['staff', 'circles', 'all'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch all staff circles'
    }
  )
}

export function useManagedStaffCirclesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/circles/managed',
    {
      headers: createJsonHeaders()
    },
    parseManagedStaffCircles,
    {
      queryKey: ['staff', 'circles', 'managed'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch managed staff circles'
    }
  )
}

export function useStaffCircleDetailQuery(circleId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/circles/{circleID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          circleID: toValue(circleId)
        }
      }
    }),
    parseStaffCircle,
    {
      queryKey: computed(() => ['staff', 'circles', 'detail', toValue(circleId)]),
      enabled: computed(() => toValue(enabled) && toValue(circleId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff circle'
    }
  )
}

export function useStaffCircleMailFormQuery(circleId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/circles/{circleID}/email',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          circleID: toValue(circleId)
        }
      }
    }),
    parseStaffCircleMailForm,
    {
      queryKey: computed(() => ['staff', 'circles', 'mail', toValue(circleId)]),
      enabled: computed(() => toValue(enabled) && toValue(circleId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff circle mail form'
    }
  )
}

export function useCreateStaffCircleMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffCirclePayload) => createStaffCircle(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles'] }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles', 'managed'] }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['circles', 'selectable'] })
      ])
    }
  })
}

export function useUpdateStaffCircleMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: UpdateStaffCirclePayload) => updateStaffCircle(payload, sessionStore.csrfToken),
    onSuccess: async (updatedCircle) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles'] }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles', 'managed'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'circles', 'detail', updatedCircle.id]
        }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['circles', 'selectable'] }),
        queryClient.invalidateQueries({ queryKey: ['session', 'bootstrap'] })
      ])

      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
    }
  })
}

export function useDeleteStaffCircleMutation(circleId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => deleteStaffCircle(toValue(circleId), sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles'] }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles', 'managed'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'circles', 'detail', toValue(circleId)]
        }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'circles', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['circles', 'selectable'] })
      ])
    }
  })
}

export function useSendStaffCircleMailMutation(circleId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: Omit<SendStaffCircleMailPayload, 'circleId'>) =>
      sendStaffCircleMail({ ...payload, circleId: toValue(circleId) }, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['staff', 'circles', 'mail', toValue(circleId)]
        }),
        queryClient.invalidateQueries({ queryKey: ['staff', 'mails'] })
      ])
    }
  })
}

export function useStaffCircleForm() {
  return ref<MutateStaffCirclePayload>({
    name: '',
    nameYomi: '',
    groupName: '',
    groupNameYomi: '',
    participationTypeId: '',
    notes: '',
    status: 'pending',
    statusReason: '',
    placeIds: []
  })
}

export function useStaffCircleMailForm() {
  return ref<{ recipient: 'all' | 'leader'; subject: string; body: string }>({
    recipient: 'all',
    subject: '',
    body: ''
  })
}

export function extractStaffCircleValidationMessage(error: unknown) {
  return extractValidationMessage(error, '企画の保存に失敗しました。')
}

export function extractStaffCircleMailValidationMessage(error: unknown) {
  return extractValidationMessage(error, '企画向けメールの登録に失敗しました。')
}

export function buildStaffCirclesExportUrl() {
  return buildApiUrl('/staff/circles/export')
}

function parseStaffCircles(value: unknown): StaffCircle[] {
  return parseWithSchema(staffCircleSchema.array(), value, 'staff circles')
}

function parseManagedStaffCircles(value: unknown): StaffManagedCircle[] {
  return parseWithSchema(staffManagedCircleSchema.array(), value, 'managed staff circles')
}

function parseStaffCircle(value: unknown): StaffCircle {
  return parseWithSchema(staffCircleSchema, value, 'staff circle')
}

function parseStaffCircleMailForm(value: unknown): StaffCircleMailForm {
  return parseWithSchema(staffCircleMailFormSchema, value, 'staff circle mail form')
}

export type StaffCirclePage = PaginatedResult<StaffCircle>
