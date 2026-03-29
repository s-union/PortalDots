import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { buildApiUrl, createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, staffMailSchema } from '@/lib/api/schema'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

export interface StaffMail {
  circle: {
    id: string
    name: string
  }
  id: string
  subject: string
  body: string
  recipients: string[]
  status: 'queued' | 'sent'
  createdAt: string
  deliveredAt: string
}

interface CreateStaffMailPayload {
  circleId: string
  subject: string
  body: string
  recipients: string[]
}

export async function fetchStaffMails() {
  return $api.queryData(
    'get',
    '/staff/mails',
    {
      headers: createJsonHeaders()
    },
    parseStaffMails,
    {
      errorMessage: 'Failed to fetch staff mails'
    }
  )
}

export async function createStaffMail(payload: CreateStaffMailPayload, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/mails',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseStaffMail,
    {
      errorMessage: 'Failed to enqueue staff mail',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff mail')
      }
    }
  )
}

export async function deleteStaffMails(csrfToken: string) {
  const response = await fetch(buildApiUrl('/staff/mails'), {
    method: 'DELETE',
    credentials: 'include',
    headers: createJsonHeaders(csrfToken)
  })
  if (!response.ok) {
    throw new Error('Failed to delete staff mails')
  }
}

export function useStaffMailsQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/mails',
    {
      headers: createJsonHeaders()
    },
    parseStaffMails,
    {
      queryKey: ['staff', 'mails'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff mails'
    }
  )
}

export function useCreateStaffMailMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: CreateStaffMailPayload) => createStaffMail(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['staff', 'mails']
      })
    }
  })
}

export function useDeleteStaffMailsMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => deleteStaffMails(sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['staff', 'mails']
      })
    }
  })
}

export function useStaffMailForm() {
  return ref({
    circleId: '',
    subject: '',
    body: '',
    recipientsText: ''
  })
}

export function normalizeRecipientList(recipientsText: string) {
  return [
    ...new Set(
      recipientsText
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ]
}

export function extractStaffMailValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'メールの登録に失敗しました。')
}

function parseStaffMails(value: unknown): StaffMail[] {
  return parseWithSchema(staffMailSchema.array(), value, 'staff mails')
}

function parseStaffMail(value: unknown): StaffMail {
  return parseWithSchema(staffMailSchema, value, 'staff mail')
}
