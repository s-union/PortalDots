import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, postMultipart, $api } from '@/lib/api/client'
import { contactCategorySchema, contactSubmissionSchema, parseWithSchema, parseArrayWithSchema } from '@/lib/api/schema'
import { useSessionStore } from '@/features/session/store'
import { extractValidationMessage, parseValidationError, unwrapValidationError } from '@/lib/api/validation'

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
  attachment?: ContactAttachment
}

/** Metadata for an attachment stored with a contact submission. */
export interface ContactAttachment {
  filename: string
  mimeType: string
  sizeBytes: number
}

/** Fields accepted when submitting a contact form. */
export interface SubmitContactPayload {
  categoryId: string
  subject: string
  body: string
  ccSubleader?: boolean
  file?: File
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
  const formData = new FormData()
  formData.set('categoryId', payload.categoryId)
  formData.set('subject', payload.subject)
  formData.set('body', payload.body)
  formData.set('ccSubleader', String(payload.ccSubleader ?? true))
  if (payload.file) {
    formData.set('file', payload.file)
  }

  const response = await postMultipart('/contact', formData, csrfToken)
  if (response.status === 422) {
    throw new Error('Validation failed', {
      cause: parseValidationError(await response.json(), 'contact')
    })
  }
  if (!response.ok) {
    throw new Error('Failed to submit contact')
  }
  return parseContactResult(await response.json())
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

/** Returns the server-side validation message for the attachment field. */
export function extractContactFileValidationMessage(error: unknown) {
  return unwrapValidationError(error)?.errors.file?.[0] ?? ''
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
