import { computed, ref, type MaybeRefOrGetter, toValue, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import * as v from 'valibot'
import { $api, buildApiUrl, createJsonHeaders, postMultipart } from '@/lib/api/client'
import {
  formAnswerEnvelopeSchema,
  formAnswerSchema,
  parseWithSchema,
  type AnswerId,
  type QuestionId,
  type UploadId
} from '@/lib/api/schema'
import { extractValidationMessage as extractApiValidationMessage, parseValidationError } from '@/lib/api/validation'
import type { FormQuestion } from '@/features/forms/api'
import { useSessionStore } from '@/features/session/store'

export interface FormAnswer {
  id: AnswerId
  body: string
  updatedAt: string
  details: Record<string, string[]>
  uploads: FormAnswerUpload[]
}

export interface FormAnswerUpload {
  id: UploadId
  questionId: QuestionId
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export type FormAnswerDraft = Record<string, string | string[]>
export type AnswerableQuestionRef = Pick<FormQuestion, 'id' | 'type'>
export type FormAnswers = ReturnType<typeof parseFormAnswers>

interface FormAnswersResponse {
  answers: FormAnswer[]
}

interface FormAnswerEnvelope {
  answer: FormAnswer | null
}

interface UploadAnswerFilePayload {
  answerId?: string
  questionId: string
  file: File
}

interface FormAnswerMutationContext {
  circleId: string
  formId: string
  answerId?: string
}

function currentCircleId(sessionStore: ReturnType<typeof useSessionStore>) {
  return sessionStore.currentCircle?.id ?? 'none'
}

function formAnswerQueryKey(formId: string, circleId: string) {
  return ['forms', 'answer', formId, circleId] as const
}

function formAnswersQueryKey(formId: string, circleId: string) {
  return ['forms', 'answers', formId, circleId] as const
}

function formAnswerByIdQueryKey(formId: string, answerId: string, circleId: string) {
  return ['forms', 'answers', formId, circleId, answerId] as const
}

function formDetailQueryKey(formId: string, circleId: string) {
  return ['forms', 'detail', formId, circleId] as const
}

function formCircleQueryKey(circleId: string) {
  return ['forms', circleId] as const
}

function formAnswerMutationContext(
  sessionStore: ReturnType<typeof useSessionStore>,
  formId: MaybeRefOrGetter<string>,
  answerId?: MaybeRefOrGetter<string>
): FormAnswerMutationContext {
  return {
    circleId: currentCircleId(sessionStore),
    formId: toValue(formId),
    ...(answerId === undefined ? {} : { answerId: toValue(answerId) })
  }
}

async function invalidateFormAnswerQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  target: FormAnswerMutationContext
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: formAnswersQueryKey(target.formId, target.circleId) }),
    queryClient.invalidateQueries({ queryKey: formDetailQueryKey(target.formId, target.circleId) }),
    queryClient.invalidateQueries({ queryKey: formCircleQueryKey(target.circleId) })
  ])
}

export async function fetchFormAnswer(formId: string) {
  return $api.queryData(
    'get',
    '/forms/{formID}/answer',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: formId
        }
      }
    },
    parseFormAnswerEnvelope,
    {
      errorMessage: 'Failed to fetch form answer'
    }
  )
}

export async function fetchFormAnswers(formId: string) {
  return $api.queryData(
    'get',
    '/forms/{formID}/answers',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: formId
        }
      }
    },
    parseFormAnswers,
    {
      errorMessage: 'Failed to fetch form answers'
    }
  )
}

export async function fetchFormAnswerById(formId: string, answerId: string) {
  return $api.queryData(
    'get',
    '/forms/{formID}/answers/{answerID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: formId,
          answerID: answerId
        }
      }
    },
    parseFormAnswerEnvelope,
    {
      errorMessage: 'Failed to fetch form answer'
    }
  )
}

export async function createFormAnswer(formId: string, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/forms/{formID}/answers',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId
        }
      }
    },
    parseFormAnswerEnvelope,
    {
      errorMessage: 'Failed to create form answer',
      errorParsers: {
        422: (error) => parseValidationError(error, 'form answer')
      }
    }
  )
}

export async function upsertFormAnswer(formId: string, draft: FormAnswerDraft, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/forms/{formID}/answer',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId
        }
      },
      body: {
        body: summarizeDraftForLegacy(draft),
        details: draftToDetailsPayload(draft)
      }
    },
    parseFormAnswerEnvelope,
    {
      errorMessage: 'Failed to save form answer',
      errorParsers: {
        422: (error) => parseValidationError(error, 'form answer')
      }
    }
  )
}

export async function updateFormAnswer(formId: string, answerId: string, draft: FormAnswerDraft, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/forms/{formID}/answers/{answerID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          formID: formId,
          answerID: answerId
        }
      },
      body: {
        body: summarizeDraftForLegacy(draft),
        details: draftToDetailsPayload(draft)
      }
    },
    parseFormAnswerEnvelope,
    {
      errorMessage: 'Failed to save form answer',
      errorParsers: {
        422: (error) => parseValidationError(error, 'form answer')
      }
    }
  )
}

export function useFormAnswerQuery(formId: MaybeRefOrGetter<string>) {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/forms/{formID}/answer',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: toValue(formId)
        }
      }
    }),
    parseFormAnswerEnvelope,
    {
      queryKey: computed(() => formAnswerQueryKey(toValue(formId), currentCircleId(sessionStore))),
      enabled: computed(() => toValue(formId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch form answer'
    }
  )
}

export function useFormAnswersQuery(formId: MaybeRefOrGetter<string>) {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/forms/{formID}/answers',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: toValue(formId)
        }
      }
    }),
    parseFormAnswers,
    {
      queryKey: computed(() => formAnswersQueryKey(toValue(formId), currentCircleId(sessionStore))),
      enabled: computed(
        () => sessionStore.isAuthenticated && sessionStore.currentCircle !== null && toValue(formId).trim().length > 0
      ),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch form answers'
    }
  )
}

export function useFormAnswerByIdQuery(formId: MaybeRefOrGetter<string>, answerId: MaybeRefOrGetter<string>) {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/forms/{formID}/answers/{answerID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          formID: toValue(formId),
          answerID: toValue(answerId)
        }
      }
    }),
    parseFormAnswerEnvelope,
    {
      queryKey: computed(() =>
        formAnswerByIdQueryKey(toValue(formId), toValue(answerId), currentCircleId(sessionStore))
      ),
      enabled: computed(
        () =>
          sessionStore.isAuthenticated &&
          sessionStore.currentCircle !== null &&
          toValue(formId).trim().length > 0 &&
          toValue(answerId).trim().length > 0
      ),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch form answer'
    }
  )
}

export function useFormAnswerMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (draft: FormAnswerDraft) => {
      return upsertFormAnswer(toValue(formId), { ...draft }, sessionStore.csrfToken)
    },
    onMutate: (): FormAnswerMutationContext => formAnswerMutationContext(sessionStore, formId),
    onSuccess: async (envelope, _draft, mutationContext) => {
      if (!mutationContext) return
      queryClient.setQueryData(formAnswerQueryKey(mutationContext.formId, mutationContext.circleId), envelope)
      await invalidateFormAnswerQueries(queryClient, mutationContext)
    }
  })
}

export function useCreateFormAnswerMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => createFormAnswer(toValue(formId), sessionStore.csrfToken),
    onMutate: (): FormAnswerMutationContext => formAnswerMutationContext(sessionStore, formId),
    onSuccess: async (_envelope, _variables, mutationContext) => {
      if (!mutationContext) return
      await invalidateFormAnswerQueries(queryClient, mutationContext)
    }
  })
}

export function useUpdateFormAnswerMutation(formId: MaybeRefOrGetter<string>, answerId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (draft: FormAnswerDraft) =>
      updateFormAnswer(toValue(formId), toValue(answerId), { ...draft }, sessionStore.csrfToken),
    onMutate: (): FormAnswerMutationContext => formAnswerMutationContext(sessionStore, formId, answerId),
    onSuccess: async (envelope, _draft, mutationContext) => {
      if (!mutationContext) return
      if (mutationContext.answerId) {
        queryClient.setQueryData(
          formAnswerByIdQueryKey(mutationContext.formId, mutationContext.answerId, mutationContext.circleId),
          envelope
        )
      }
      await invalidateFormAnswerQueries(queryClient, mutationContext)
    }
  })
}

export function useFormAnswerUploadMutation(formId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: UploadAnswerFilePayload) =>
      uploadFormAnswerFile(toValue(formId), payload, sessionStore.csrfToken),
    onMutate: (): FormAnswerMutationContext => formAnswerMutationContext(sessionStore, formId),
    onSuccess: async (_result, _payload, mutationContext) => {
      if (!mutationContext) return
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: formAnswerQueryKey(mutationContext.formId, mutationContext.circleId)
        }),
        queryClient.invalidateQueries({
          queryKey: formAnswersQueryKey(mutationContext.formId, mutationContext.circleId)
        })
      ])
    }
  })
}

export function useFormAnswerDraft(formId: MaybeRefOrGetter<string>, questions: MaybeRefOrGetter<FormQuestion[]>) {
  const answerQuery = useFormAnswerQuery(formId)
  const draft = useFormAnswerEditorDraft(
    computed(() => answerQuery.data.value?.answer),
    questions
  )

  return {
    answerQuery,
    draft
  }
}

export function useFormAnswerEditorDraft(
  answer: MaybeRefOrGetter<FormAnswer | null | undefined>,
  questions: MaybeRefOrGetter<FormQuestion[]>
) {
  const draft = ref<FormAnswerDraft>({})

  watch(
    [() => toValue(answer), () => toValue(questions)],
    ([currentAnswer, currentQuestions]) => {
      draft.value = buildFormAnswerDraft(currentAnswer, currentQuestions)
    },
    { immediate: true }
  )

  return draft
}

function buildFormAnswerDraft(answer: FormAnswer | null | undefined, questions: FormQuestion[]): FormAnswerDraft {
  const draft: FormAnswerDraft = {}
  if (questions.length === 0) {
    draft['legacy-body'] = answer?.body ?? ''
    return draft
  }

  for (const question of questions) {
    if (question.type === 'heading' || question.type === 'upload') {
      continue
    }
    const values = answer?.details[question.id] ?? []
    if (question.type === 'checkbox') {
      draft[question.id] = [...values]
      continue
    }
    draft[question.id] = values[0] ?? ''
  }
  return draft
}

export function isFormAnswerDraftDirty(
  draft: FormAnswerDraft,
  answer: FormAnswer | null | undefined,
  questions: FormQuestion[]
): boolean {
  return !formAnswerDraftsEqual(draft, buildFormAnswerDraft(answer, questions))
}

function formAnswerDraftsEqual(a: FormAnswerDraft, b: FormAnswerDraft): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  return aKeys.every((key) => {
    const aValue = a[key]
    const bValue = b[key]
    if (Array.isArray(aValue) || Array.isArray(bValue)) {
      return (
        Array.isArray(aValue) &&
        Array.isArray(bValue) &&
        aValue.length === bValue.length &&
        aValue.every((item, index) => item === bValue[index])
      )
    }
    return aValue === bValue
  })
}

export function extractValidationMessage(error: unknown) {
  return extractApiValidationMessage(error, '回答の保存に失敗しました。')
}

export function answerValue(draft: FormAnswerDraft, question: AnswerableQuestionRef) {
  const value = draft[question.id]
  if (question.type === 'checkbox') {
    return Array.isArray(value) ? value : []
  }
  return typeof value === 'string' ? value : ''
}

export function createAnswerableQuestionRef(
  questionId: QuestionId,
  type: AnswerableQuestionRef['type']
): AnswerableQuestionRef {
  return { id: questionId, type }
}

export function setAnswerValue(draft: FormAnswerDraft, question: AnswerableQuestionRef, value: string | string[]) {
  draft[question.id] = value
}

export function questionUploads(answer: FormAnswer | null | undefined, questionId: string) {
  return (answer?.uploads ?? []).filter((upload) => upload.questionId === questionId)
}

function parseFormAnswerEnvelope(value: unknown): FormAnswerEnvelope {
  return parseWithSchema(formAnswerEnvelopeSchema, value, 'form answer')
}

function parseFormAnswers(value: unknown): FormAnswersResponse {
  return parseWithSchema(
    v.object({
      answers: v.array(formAnswerSchema)
    }),
    value,
    'form answers'
  )
}

async function uploadFormAnswerFile(formId: string, payload: UploadAnswerFilePayload, csrfToken: string) {
  const formData = new FormData()
  formData.set('file', payload.file)
  formData.set('questionId', payload.questionId)

  const uploadPath =
    payload.answerId && payload.answerId.trim().length > 0
      ? `/forms/${encodeURIComponent(formId)}/answers/${encodeURIComponent(payload.answerId)}/uploads`
      : `/forms/${encodeURIComponent(formId)}/answer/uploads`

  const response = await postMultipart(uploadPath, formData, csrfToken)
  if (response.status === 422) {
    throw new Error('Validation failed', {
      cause: parseValidationError(await response.json(), 'form answer upload')
    })
  }
  if (!response.ok) {
    throw new Error('Failed to upload answer file')
  }
}

export function buildFormAnswerUploadDownloadUrl(formId: string, uploadId: string) {
  return buildApiUrl(`/forms/${encodeURIComponent(formId)}/answer/uploads/${encodeURIComponent(uploadId)}/file`)
}

export function buildFormAnswerUploadDownloadUrlByAnswer(formId: string, answerId: string, questionId: string) {
  return buildApiUrl(
    `/forms/${encodeURIComponent(formId)}/answers/${encodeURIComponent(answerId)}/uploads/${encodeURIComponent(questionId)}/file`
  )
}

export function updateDraftValue(draft: FormAnswerDraft, questionId: string, value: string | string[]) {
  draft[questionId] = value
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

function summarizeDraftForLegacy(draft: FormAnswerDraft) {
  const lines: string[] = []
  for (const value of Object.values(draft)) {
    if (Array.isArray(value)) {
      const filtered = value.filter((item) => item.trim().length > 0)
      if (filtered.length > 0) {
        lines.push(filtered.join(', '))
      }
      continue
    }
    if (value.trim().length > 0) {
      lines.push(value.trim())
    }
  }
  return lines.join('\n')
}
