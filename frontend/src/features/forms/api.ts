import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import type { z } from 'zod'
import { createJsonHeaders, $api, $apiSuspense } from '@/lib/api/client'
import { formDetailSchema, formSummarySchema, parseWithSchema, type formQuestionSchema } from '@/lib/api/schema'
import { useSessionStore } from '@/features/session/store'
export type FormSummary = z.infer<typeof formSummarySchema>
export type FormQuestion = z.infer<typeof formQuestionSchema>
export type FormDetail = z.infer<typeof formDetailSchema>

export async function fetchForms() {
  return $api.queryData(
    'get',
    '/forms',
    {
      headers: createJsonHeaders()
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

export function useFormsQuery() {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/forms',
    {
      headers: createJsonHeaders()
    },
    parseForms,
    {
      queryKey: computed(() => ['forms', sessionStore.currentCircle?.id ?? 'none']),
      enabled: computed(() => sessionStore.isAuthenticated && sessionStore.currentCircle !== null),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch forms'
    }
  )
}

export function useSuspenseFormsQuery() {
  const sessionStore = useSessionStore()

  return $apiSuspense.useSuspenseQueryData(
    'get',
    '/forms',
    {
      headers: createJsonHeaders()
    },
    parseForms,
    {
      queryKey: computed(() => ['forms', sessionStore.currentCircle?.id ?? 'none']),
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

function parseForms(value: unknown): FormSummary[] {
  return parseWithSchema(formSummarySchema.array(), value, 'forms')
}

function parseFormDetail(value: unknown): FormDetail {
  return parseWithSchema(formDetailSchema, value, 'form detail')
}

export function buildLegacyFormAnswerRoute(formId: string, answerId: string) {
  return `/workspace/forms/${encodeURIComponent(formId)}?answer=${encodeURIComponent(answerId)}`
}
