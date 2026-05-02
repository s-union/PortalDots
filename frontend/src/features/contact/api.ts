import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { contactCategorySchema, contactSubmissionSchema, parseWithSchema, parseArrayWithSchema } from '@/lib/api/schema'
import { useSessionStore } from '@/features/session/store'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'

export interface ContactCategory {
  id: string
  name: string
}

export interface ContactSubmission {
  id: string
  categoryId: string
  categoryName: string
  subject: string
  status: string
  createdAt: string
}

interface SubmitContactPayload {
  categoryId: string
  subject: string
  body: string
}

type SubmitContactResult = ContactSubmission

export async function fetchContactCategories() {
  return $api.queryData(
    'get',
    '/contact-categories',
    {
      headers: createJsonHeaders()
    },
    parseContactCategories,
    {
      errorMessage: 'Failed to fetch contact categories'
    }
  )
}

export async function submitContact(payload: SubmitContactPayload, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/contact',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseContactResult,
    {
      errorMessage: 'Failed to submit contact',
      errorParsers: {
        422: (error) => parseValidationError(error, 'contact')
      }
    }
  )
}

export async function fetchContactHistory() {
  return $api.queryData(
    'get',
    '/contact',
    {
      headers: createJsonHeaders()
    },
    parseContactHistory,
    {
      errorMessage: 'Failed to fetch contact history'
    }
  )
}

export function useContactCategoriesQuery() {
  return $api.useQueryData(
    'get',
    '/contact-categories',
    {
      headers: createJsonHeaders()
    },
    parseContactCategories,
    {
      queryKey: ['contact', 'categories'],
      retry: false
    },
    {
      errorMessage: 'Failed to fetch contact categories'
    }
  )
}

export function useContactHistoryQuery() {
  return $api.useQueryData(
    'get',
    '/contact',
    {
      headers: createJsonHeaders()
    },
    parseContactHistory,
    {
      queryKey: ['contact', 'history'],
      retry: false
    },
    {
      errorMessage: 'Failed to fetch contact history'
    }
  )
}

export function useSubmitContactMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: SubmitContactPayload) => submitContact(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contact', 'categories'] }),
        queryClient.invalidateQueries({ queryKey: ['contact', 'history'] })
      ])
    }
  })
}

export function extractContactValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'お問い合わせの送信に失敗しました。')
}

function parseContactCategories(value: unknown): ContactCategory[] {
  return parseArrayWithSchema(contactCategorySchema, value, 'contact categories')
}

function parseContactResult(value: unknown): SubmitContactResult {
  return parseWithSchema(contactSubmissionSchema, value, 'contact')
}

function parseContactHistory(value: unknown): ContactSubmission[] {
  return parseArrayWithSchema(contactSubmissionSchema, value, 'contact history')
}
