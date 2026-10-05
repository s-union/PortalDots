import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { apiClient, createJsonHeaders, expectApiData, $api } from '@/lib/api/client'
import { parseWithSchema, parseArrayWithSchema, staffMailSchema } from '@/lib/api/schema'
import { parseTagString } from '@/lib/tags'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

export interface StaffMail {
  jobId: string
  template: string
  priority: 'high' | 'normal'
  subject: string
  body: string
  recipients: string[]
  createdAt: string
}

interface CreateStaffMailPayload {
  circleId: string
  subject: string
  body: string
  recipients: string[]
}

export async function fetchStaffMails(cursor = '', signal?: AbortSignal) {
  const result = await apiClient.GET('/staff/mails', {
    headers: createJsonHeaders(),
    params: { query: { limit: 50, cursor: cursor || undefined } },
    signal
  })
  return {
    items: parseStaffMails(expectApiData(result, 'Failed to fetch staff mails')),
    nextCursor: result.response.headers.get('X-Next-Cursor') || undefined
  }
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

export function useStaffMailsQuery(enabled: MaybeRefOrGetter<boolean>) {
  const query = useInfiniteQuery({
    queryKey: ['staff', 'mails', 'history'],
    initialPageParam: '',
    queryFn: ({ pageParam, signal }) => fetchStaffMails(pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: false
  })
  return {
    ...query,
    data: computed(() => query.data.value?.pages.flatMap((page) => page.items) ?? [])
  }
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

export function useStaffMailForm() {
  return ref({
    circleId: '',
    subject: '',
    body: '',
    recipientsText: ''
  })
}

export function normalizeRecipientList(recipientsText: string) {
  return parseTagString(recipientsText)
}

export function extractStaffMailValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'メールの登録に失敗しました。')
}

function parseStaffMails(value: unknown): StaffMail[] {
  return parseArrayWithSchema(staffMailSchema, value, 'staff mails')
}

function parseStaffMail(value: unknown): StaffMail {
  return parseWithSchema(staffMailSchema, value, 'staff mail')
}
