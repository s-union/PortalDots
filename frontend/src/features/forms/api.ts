import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import type { z } from 'zod'
import { createJsonHeaders, $api, $apiSuspense } from '@/lib/api/client'
import { formDetailSchema, formSummarySchema, parseWithSchema, type formQuestionSchema } from '@/lib/api/schema'
import { useSessionStore } from '@/features/session/store'
import { parsePaginatedResult, type PaginatedResult } from '@/lib/api/pagination'
export type FormSummary = z.infer<typeof formSummarySchema>
export type FormQuestion = z.infer<typeof formQuestionSchema>
export type FormDetail = z.infer<typeof formDetailSchema>

export interface FormsPagination {
  page: number
  pageSize: number
  status?: 'open' | 'closed' | 'all'
  query?: string
}

export type FormsPage = PaginatedResult<FormSummary>

export async function fetchForms(pagination: FormsPagination = { page: 1, pageSize: 20, status: 'open' }) {
  return $api.queryData(
    'get',
    '/forms',
    {
      headers: createJsonHeaders(),
      params: {
        query: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          status: pagination.status ?? 'open',
          ...(pagination.query?.trim() ? { query: pagination.query.trim() } : {})
        }
      }
    },
    parseForms,
    {
      errorMessage: 'Failed to fetch forms'
    }
  )
}

export async function fetchForm(formId: string) {
  return $api.queryData(
    'get',
    '/forms/{formID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: formId
        }
      }
    },
    parseFormDetail,
    {
      errorMessage: 'Failed to fetch form'
    }
  )
}

export function useFormsQuery(
  pagination: MaybeRefOrGetter<FormsPagination> = { page: 1, pageSize: 20, status: 'open' }
) {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/forms',
    () => ({
      headers: createJsonHeaders(),
      params: {
        query: {
          page: toValue(pagination).page,
          pageSize: toValue(pagination).pageSize,
          status: toValue(pagination).status ?? 'open',
          ...(toValue(pagination).query?.trim() ? { query: toValue(pagination).query?.trim() } : {})
        }
      }
    }),
    parseForms,
    {
      queryKey: computed(() => ['forms', sessionStore.currentCircle?.id ?? 'none', toValue(pagination)]),
      enabled: computed(() => sessionStore.isAuthenticated && sessionStore.currentCircle !== null),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch forms'
    }
  )
}

export function useSuspenseFormsQuery(
  pagination: MaybeRefOrGetter<FormsPagination> = { page: 1, pageSize: 20, status: 'open' }
) {
  const sessionStore = useSessionStore()

  return $apiSuspense.useSuspenseQueryData(
    'get',
    '/forms',
    () => ({
      headers: createJsonHeaders(),
      params: {
        query: {
          page: toValue(pagination).page,
          pageSize: toValue(pagination).pageSize,
          status: toValue(pagination).status ?? 'open',
          ...(toValue(pagination).query?.trim() ? { query: toValue(pagination).query?.trim() } : {})
        }
      }
    }),
    parseForms,
    {
      queryKey: computed(() => ['forms', sessionStore.currentCircle?.id ?? 'none', toValue(pagination)]),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch forms'
    }
  )
}

export function useFormDetailQuery(formId: MaybeRefOrGetter<string>) {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/forms/{formID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: toValue(formId)
        }
      }
    }),
    parseFormDetail,
    {
      queryKey: computed(() => ['forms', 'detail', toValue(formId), sessionStore.currentCircle?.id ?? 'none']),
      enabled: computed(
        () => sessionStore.isAuthenticated && sessionStore.currentCircle !== null && toValue(formId).trim().length > 0
      ),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch form'
    }
  )
}

function parseForms(value: unknown): FormsPage {
  return parsePaginatedResult(value, (item) => parseWithSchema(formSummarySchema, item, 'form'), 'forms')
}

function parseFormDetail(value: unknown): FormDetail {
  return parseWithSchema(formDetailSchema, value, 'form detail')
}

export function buildLegacyFormAnswerRoute(formId: string, answerId: string) {
  return `/workspace/forms/${encodeURIComponent(formId)}?answer=${encodeURIComponent(answerId)}`
}
