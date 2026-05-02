import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { buildApiUrl, createJsonHeaders, encodePathSegment, $api, postMultipart, putMultipart } from '@/lib/api/client'
import {
  parseWithSchema,
  parseArrayWithSchema,
  staffDocumentDetailSchema,
  staffDocumentSummarySchema
} from '@/lib/api/schema'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

export interface StaffDocumentSummary {
  circle: {
    id: string
    name: string
  }
  id: string
  name: string
  description: string
  notes: string
  isImportant: boolean
  filename: string
  extension: string
  mimeType: string
  sizeBytes: number
  isPublic: boolean
  createdAt: string
  updatedAt: string
  downloadUrl: string
}

export type StaffDocumentDetail = StaffDocumentSummary & {
  notes: string
}

export interface MutateStaffDocumentPayload {
  circleId: string
  name: string
  description: string
  notes: string
  isPublic: boolean
  isImportant: boolean
  file: File | null
}

export async function fetchStaffDocuments() {
  return $api.queryData(
    'get',
    '/staff/documents',
    {
      headers: createJsonHeaders()
    },
    parseStaffDocuments,
    {
      errorMessage: 'Failed to fetch staff documents'
    }
  )
}

export async function fetchStaffDocument(documentId: string) {
  return $api.queryData(
    'get',
    '/staff/documents/{documentID}/edit',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          documentID: documentId
        }
      }
    },
    parseStaffDocumentDetail,
    {
      errorMessage: 'Failed to fetch staff document'
    }
  )
}

export async function createStaffDocument(payload: MutateStaffDocumentPayload, csrfToken: string) {
  const formData = new FormData()
  formData.set('circleId', payload.circleId)
  formData.set('name', payload.name)
  formData.set('description', payload.description)
  formData.set('notes', payload.notes)
  formData.set('isPublic', String(payload.isPublic))
  formData.set('isImportant', String(payload.isImportant))
  if (payload.file !== null) {
    formData.set('file', payload.file)
  }

  const response = await postMultipart('/staff/documents', formData, csrfToken)
  const raw = await response.text()
  const data = raw === '' ? null : parseJson(raw)

  if (response.status === 422) {
    throw new Error('Staff document validation failed', {
      cause: parseValidationError(data, 'staff document')
    })
  }
  if (!response.ok) {
    throw new Error('Failed to create staff document', {
      cause: data
    })
  }

  return parseStaffDocument(data)
}

export async function updateStaffDocument(documentId: string, payload: MutateStaffDocumentPayload, csrfToken: string) {
  const formData = new FormData()
  formData.set('circleId', payload.circleId)
  formData.set('name', payload.name)
  formData.set('description', payload.description)
  formData.set('notes', payload.notes)
  formData.set('isPublic', String(payload.isPublic))
  formData.set('isImportant', String(payload.isImportant))
  if (payload.file !== null) {
    formData.set('file', payload.file)
  }

  const response = await putMultipart(`/staff/documents/${encodePathSegment(documentId)}`, formData, csrfToken)
  const raw = await response.text()
  const data = raw === '' ? null : parseJson(raw)

  if (response.status === 422) {
    throw new Error('Staff document validation failed', {
      cause: parseValidationError(data, 'staff document')
    })
  }
  if (!response.ok) {
    throw new Error('Failed to update staff document', {
      cause: data
    })
  }

  return parseStaffDocument(data)
}

export async function deleteStaffDocument(documentId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/documents/{documentID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          documentID: documentId
        }
      }
    },
    {
      errorMessage: 'Failed to delete staff document'
    }
  )
}

export function useStaffDocumentsQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/documents',
    {
      headers: createJsonHeaders()
    },
    parseStaffDocuments,
    {
      queryKey: ['staff', 'documents'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff documents'
    }
  )
}

export function useStaffDocumentDetailQuery(documentId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/documents/{documentID}/edit',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          documentID: toValue(documentId)
        }
      }
    }),
    parseStaffDocumentDetail,
    {
      queryKey: computed(() => ['staff', 'documents', 'detail', toValue(documentId)]),
      enabled: computed(() => toValue(enabled) && toValue(documentId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff document'
    }
  )
}

export function useCreateStaffDocumentMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffDocumentPayload) => createStaffDocument(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'documents'] }),
        queryClient.invalidateQueries({ queryKey: ['documents'] })
      ])
    }
  })
}

export function useUpdateStaffDocumentMutation(documentId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffDocumentPayload) =>
      updateStaffDocument(toValue(documentId), payload, sessionStore.csrfToken),
    onSuccess: async (updatedDocument) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'documents'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'documents', 'detail', updatedDocument.id]
        }),
        queryClient.invalidateQueries({ queryKey: ['documents'] })
      ])
    }
  })
}

export function useDeleteStaffDocumentMutation(documentId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => deleteStaffDocument(toValue(documentId), sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'documents'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'documents', 'detail', toValue(documentId)]
        }),
        queryClient.invalidateQueries({ queryKey: ['documents'] })
      ])
    }
  })
}

export function useStaffDocumentForm() {
  return ref<MutateStaffDocumentPayload>({
    circleId: '',
    name: '',
    description: '',
    notes: '',
    isPublic: true,
    isImportant: false,
    file: null
  })
}

export function extractStaffDocumentValidationMessage(error: unknown) {
  return extractValidationMessage(error, '配布資料のアップロードに失敗しました。')
}

export function buildDeleteStaffDocumentConfirmMessage(documentName: string) {
  return `配布資料「${documentName}」を削除しますか？`
}

export function buildStaffDocumentDownloadUrl(documentId: string) {
  return buildApiUrl(`/staff/documents/${encodeURIComponent(documentId)}`)
}

export function buildStaffDocumentsExportUrl() {
  return buildApiUrl('/staff/documents/export')
}

function parseStaffDocuments(value: unknown): StaffDocumentSummary[] {
  return parseArrayWithSchema(staffDocumentSummarySchema, value, 'staff documents')
}

function parseStaffDocument(value: unknown): StaffDocumentSummary {
  return parseWithSchema(staffDocumentSummarySchema, value, 'staff document')
}

function parseStaffDocumentDetail(value: unknown): StaffDocumentDetail {
  return parseWithSchema(staffDocumentDetailSchema, value, 'staff document detail')
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
