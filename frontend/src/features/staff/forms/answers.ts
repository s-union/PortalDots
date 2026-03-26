import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { $api, buildApiUrl, createJsonHeaders, postMultipart } from '@/lib/api/client'
import {
  existingAnswerConflictSchema,
  parseWithSchema,
  staffFormAnswersIndexSchema,
  staffManagedFormAnswerDetailSchema,
  staffManagedFormAnswerSummarySchema,
  staffManagedFormAnswerValueSchema
} from '@/lib/api/schema'
import { extractValidationMessage as extractApiValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'
import type { FormAnswerDraft } from '@/features/forms/answers'
import type { StaffFormDetail, StaffFormUpload } from '@/features/staff/forms/api'

export interface StaffAnswerCircle {
  id: string
  name: string
  groupName: string
  participationTypeName: string
}

export interface StaffManagedFormAnswerSummary {
  id: string
  circle: StaffAnswerCircle
  body: string
  createdAt: string
  updatedAt: string
  uploadCount: number
  details: Record<string, string[]>
}

export interface StaffFormAnswersIndex {
  form: StaffFormDetail
  answers: StaffManagedFormAnswerSummary[]
  circles: StaffAnswerCircle[]
  notAnsweredCircles: StaffAnswerCircle[]
}

export interface StaffManagedFormAnswerDetail {
  form: StaffFormDetail
  circle: StaffAnswerCircle
  answer: {
    id: string
    body: string
    createdAt: string
    updatedAt: string
    details: Record<string, string[]>
    uploads: StaffFormUpload[]
  }
  siblingAnswers: StaffManagedFormAnswerSummary[]
}

interface MutateStaffFormAnswerPayload {
  circleId: string
  body: string
  details: Record<string, string | string[]>
}

export async function fetchStaffFormAnswersIndex(formId: string) {
  return $api.queryData(
    'get',
    '/staff/forms/{formID}/answers',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: formId
        }
      }
    },
    parseStaffFormAnswersIndex,
    {
      errorMessage: 'Failed to fetch staff form answers'
    }
  )
}

export async function fetchStaffFormAnswerDetail(formId: string, answerId: string) {
  return $api.queryData(
    'get',
    '/staff/forms/{formID}/answers/{answerID}/edit',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: formId,
          answerID: answerId
        }
      }
    },
    parseStaffFormAnswerDetail,
    {
      errorMessage: 'Failed to fetch staff form answer'
    }
  )
}

export async function createStaffFormAnswer(formId: string, payload: MutateStaffFormAnswerPayload, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/forms/{formID}/answers',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId
        }
      },
      body: payload
    },
    (value) =>
      parseWithSchema(z.object({ answer: staffManagedFormAnswerSummarySchema }), value, 'staff form answer').answer,
    {
      errorMessage: 'Failed to create staff form answer',
      errorParsers: {
        409: (error) => {
          const conflict = existingAnswerConflictSchema.safeParse(error)
          return conflict.success ? conflict.data : error
        },
        422: (error) => parseValidationError(error, 'staff form answer')
      }
    }
  )
}

export async function updateStaffFormAnswer(
  formId: string,
  answerId: string,
  payload: MutateStaffFormAnswerPayload,
  csrfToken: string
) {
  return $api.mutationData(
    'put',
    '/staff/forms/{formID}/answers/{answerID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId,
          answerID: answerId
        }
      },
      body: payload
    },
    parseStaffManagedFormAnswerValue,
    {
      errorMessage: 'Failed to update staff form answer',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff form answer')
      }
    }
  )
}

export async function deleteStaffFormAnswer(formId: string, answerId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/forms/{formID}/answers/{answerID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId,
          answerID: answerId
        }
      }
    },
    {
      errorMessage: 'Failed to delete staff form answer'
    }
  )
}

export async function uploadStaffFormAnswerFile(
  formId: string,
  answerId: string,
  questionId: string,
  file: File,
  csrfToken: string
) {
  const formData = new FormData()
  formData.set('file', file)
  formData.set('questionId', questionId)

  const response = await postMultipart(
    `/staff/forms/${encodeURIComponent(formId)}/answers/${encodeURIComponent(answerId)}/uploads`,
    formData,
    csrfToken
  )
  if (response.status === 422) {
    throw new Error('Validation failed', {
      cause: parseValidationError(await response.json(), 'staff form answer upload')
    })
  }
  if (!response.ok) {
    throw new Error('Failed to upload staff form answer file')
  }
}

export function useStaffFormAnswersIndexQuery(formId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/forms/{formID}/answers',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: toValue(formId)
        }
      }
    }),
    parseStaffFormAnswersIndex,
    {
      queryKey: computed(() => ['staff', 'forms', toValue(formId), 'answers']),
      enabled: computed(() => toValue(enabled) && toValue(formId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff form answers'
    }
  )
}

export function useStaffFormAnswerDetailQuery(
  formId: MaybeRefOrGetter<string>,
  answerId: MaybeRefOrGetter<string>,
  enabled: MaybeRefOrGetter<boolean>
) {
  return $api.useQueryData(
    'get',
    '/staff/forms/{formID}/answers/{answerID}/edit',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: toValue(formId),
          answerID: toValue(answerId)
        }
      }
    }),
    parseStaffFormAnswerDetail,
    {
      queryKey: computed(() => ['staff', 'forms', toValue(formId), 'answers', toValue(answerId)]),
      enabled: computed(
        () => toValue(enabled) && toValue(formId).trim().length > 0 && toValue(answerId).trim().length > 0
      ),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff form answer'
    }
  )
}

export function useCreateStaffFormAnswerMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffFormAnswerPayload) =>
      createStaffFormAnswer(toValue(formId), payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['staff', 'forms', toValue(formId), 'answers']
      })
    }
  })
}

export function useUpdateStaffFormAnswerMutation(formId: MaybeRefOrGetter<string>, answerId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffFormAnswerPayload) =>
      updateStaffFormAnswer(toValue(formId), toValue(answerId), payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', toValue(formId), 'answers']
        }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'forms', toValue(formId), 'answers', toValue(answerId)]
        })
      ])
    }
  })
}

export function useDeleteStaffFormAnswerMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (answerId: string) => deleteStaffFormAnswer(toValue(formId), answerId, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['staff', 'forms', toValue(formId), 'answers']
      })
    }
  })
}

export function useUploadStaffFormAnswerFileMutation(
  formId: MaybeRefOrGetter<string>,
  answerId: MaybeRefOrGetter<string>
) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: { questionId: string; file: File }) =>
      uploadStaffFormAnswerFile(
        toValue(formId),
        toValue(answerId),
        payload.questionId,
        payload.file,
        sessionStore.csrfToken
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['staff', 'forms', toValue(formId), 'answers', toValue(answerId)]
      })
    }
  })
}

export function buildStaffFormAnswersExportUrl(formId: string) {
  return buildApiUrl(`/staff/forms/${encodeURIComponent(formId)}/answers/export`)
}

export function buildStaffFormAnswerUploadsZipUrl(formId: string) {
  return buildApiUrl(`/staff/forms/${encodeURIComponent(formId)}/answers/uploads.zip`)
}

export function buildStaffFormAnswerUploadDownloadUrl(formId: string, answerId: string, questionId: string) {
  return buildApiUrl(
    `/staff/forms/${encodeURIComponent(formId)}/answers/${encodeURIComponent(answerId)}/uploads/${encodeURIComponent(questionId)}/file`
  )
}

export function staffAnswerDraftToPayload(
  circleId: string,
  body: string,
  draft: FormAnswerDraft
): MutateStaffFormAnswerPayload {
  return {
    circleId,
    body,
    details: draftToDetailsPayload(draft)
  }
}

export function extractStaffFormAnswerValidationMessage(error: unknown) {
  return extractApiValidationMessage(error, '回答の保存に失敗しました。')
}

export function buildDeleteStaffFormAnswerConfirmMessage(groupName: string) {
  return `この回答を削除しますか？\n\n• 回答が削除されたという通知は${groupName}には送信されません。`
}

export function extractExistingAnswerId(error: unknown) {
  if (!(error instanceof Error) || !hasErrorCause(error)) {
    return null
  }

  const parsed = existingAnswerConflictSchema.safeParse(error.cause)
  return parsed.success ? parsed.data.existingAnswerId : null
}

function parseStaffFormAnswersIndex(value: unknown): StaffFormAnswersIndex {
  return parseWithSchema(staffFormAnswersIndexSchema, value, 'staff form answers')
}

function parseStaffFormAnswerDetail(value: unknown): StaffManagedFormAnswerDetail {
  return parseWithSchema(staffManagedFormAnswerDetailSchema, value, 'staff form answer detail')
}

function parseStaffManagedFormAnswerValue(value: unknown): StaffManagedFormAnswerDetail['answer'] {
  return parseWithSchema(staffManagedFormAnswerValueSchema, value, 'staff form answer')
}

function hasErrorCause(error: Error): error is Error & { cause: unknown } {
  return 'cause' in error
}

function draftToDetailsPayload(draft: FormAnswerDraft) {
  const payload: Record<string, string | string[]> = {}
  for (const [questionId, value] of Object.entries(draft)) {
    if (Array.isArray(value)) {
      payload[questionId] = value.filter((item) => item.trim().length > 0)
      continue
    }
    payload[questionId] = value
  }
  return payload
}
