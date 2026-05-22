import { createJsonHeaders, $api } from '@/lib/api/client'
import {
  formQuestionSchema,
  parseWithSchema,
  parseArrayWithSchema,
  staffFormDetailSchema,
  staffFormPreviewSchema,
  staffFormSummarySchema
} from '@/lib/api/schema'
import { parseValidationError } from '@/lib/api/validation'
import { buildStaffListRequestParams, type StaffListQueryParamsInput } from '@/lib/staffListQuery'
import type { z } from 'zod'

export type StaffFormSummary = z.infer<typeof staffFormSummarySchema>
export type StaffFormDetail = z.infer<typeof staffFormDetailSchema>
export type StaffFormPreview = z.infer<typeof staffFormPreviewSchema>
export type StaffFormUpload = NonNullable<StaffFormDetail['answer']>['uploads'][number]
export type StaffFormQuestion = z.infer<typeof formQuestionSchema>

export const allowedQuestionTypes = [
  'heading',
  'text',
  'textarea',
  'markdown',
  'number',
  'radio',
  'select',
  'checkbox',
  'upload'
] as const

export interface CreateStaffFormPayload {
  circleId?: string
  name: string
  description: string
  openAt: string
  closeAt: string
  maxAnswers: number
  answerableTags: string[]
  confirmationMessage: string
  isPublic: boolean
}

export interface CreateStaffFormQuestionPayload {
  type: string
}

export interface UpdateStaffFormQuestionPayload {
  id: string
  name: string
  description: string
  type: string
  isRequired: boolean
  numberMin: null | number
  numberMax: null | number
  allowedTypes: string
  options: string[]
  priority: number
}

export async function fetchStaffForms(params?: StaffListQueryParamsInput) {
  return $api.queryData(
    'get',
    '/staff/forms',
    {
      headers: createJsonHeaders(),
      ...buildStaffListRequestParams(params)
    },
    parseStaffForms,
    {
      errorMessage: 'Failed to fetch staff forms'
    }
  )
}

export async function fetchStaffForm(formId: string) {
  return $api.queryData(
    'get',
    '/staff/forms/{formID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: formId
        }
      }
    },
    parseStaffFormDetail,
    {
      errorMessage: 'Failed to fetch staff form'
    }
  )
}

export async function fetchStaffFormPreview(formId: string) {
  return $api.queryData(
    'get',
    '/staff/forms/{formID}/preview',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: formId
        }
      }
    },
    parseStaffFormPreview,
    {
      errorMessage: 'Failed to fetch staff form preview'
    }
  )
}

export async function createStaffForm(payload: CreateStaffFormPayload, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/forms',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseStaffFormSummary,
    {
      errorMessage: 'Failed to create staff form',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff form')
      }
    }
  )
}

export async function updateStaffForm(formId: string, payload: CreateStaffFormPayload, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/forms/{formID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId
        }
      },
      body: payload
    },
    parseStaffFormSummary,
    {
      errorMessage: 'Failed to update staff form',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff form')
      }
    }
  )
}

export async function createStaffFormQuestion(
  formId: string,
  payload: CreateStaffFormQuestionPayload,
  csrfToken: string
) {
  return $api.mutationData(
    'post',
    '/staff/forms/{formID}/questions',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId
        }
      },
      body: payload
    },
    parseStaffFormQuestion,
    {
      errorMessage: 'Failed to create staff form question',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff form question')
      }
    }
  )
}

export async function updateStaffFormQuestion(
  formId: string,
  payload: UpdateStaffFormQuestionPayload,
  csrfToken: string
) {
  return $api.mutationData(
    'put',
    '/staff/forms/{formID}/questions/{questionID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId,
          questionID: payload.id
        }
      },
      body: {
        name: payload.name,
        description: payload.description,
        type: payload.type,
        isRequired: payload.isRequired,
        numberMin: payload.numberMin,
        numberMax: payload.numberMax,
        allowedTypes: payload.allowedTypes,
        options: payload.options,
        priority: payload.priority
      }
    },
    parseStaffFormQuestion,
    {
      errorMessage: 'Failed to update staff form question',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff form question')
      }
    }
  )
}

export async function deleteStaffFormQuestion(formId: string, questionId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/forms/{formID}/questions/{questionID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId,
          questionID: questionId
        }
      }
    },
    {
      errorMessage: 'Failed to delete staff form question'
    }
  )
}

export async function reorderStaffFormQuestions(formId: string, questionIds: string[], csrfToken: string) {
  await $api.noContentMutation(
    'put',
    '/staff/forms/{formID}/questions/order',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId
        }
      },
      body: {
        questionIds
      }
    },
    {
      errorMessage: 'Failed to reorder staff form questions'
    }
  )
}

export async function copyStaffForm(formId: string, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/forms/{formID}/copy',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId
        }
      }
    },
    parseStaffFormSummary,
    {
      errorMessage: 'Failed to copy staff form'
    }
  )
}

export async function deleteStaffForm(formId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/forms/{formID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId
        }
      }
    },
    {
      errorMessage: 'Failed to delete staff form'
    }
  )
}

export function parseStaffForms(value: unknown): StaffFormSummary[] {
  return parseArrayWithSchema(staffFormSummarySchema, value, 'staff forms')
}

export function parseStaffFormSummary(value: unknown): StaffFormSummary {
  return parseWithSchema(staffFormSummarySchema, value, 'staff form')
}

export function parseStaffFormDetail(value: unknown): StaffFormDetail {
  return parseWithSchema(staffFormDetailSchema, value, 'staff form detail')
}

export function parseStaffFormPreview(value: unknown): StaffFormPreview {
  return parseWithSchema(staffFormPreviewSchema, value, 'staff form preview')
}

export function parseStaffFormQuestion(value: unknown): StaffFormQuestion {
  return parseWithSchema(formQuestionSchema, value, 'staff form question')
}
