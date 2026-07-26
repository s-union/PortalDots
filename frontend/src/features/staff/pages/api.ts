import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { buildApiUrl, createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, parseArrayWithSchema, staffPageDetailSchema, staffPageSummarySchema } from '@/lib/api/schema'
import { parseValidationError, unwrapValidationError } from '@/lib/api/validation'
import { parseTagString, formatTags } from '@/lib/tags'
import {
  buildStaffListRequestParams,
  type StaffListQueryParams,
  type StaffListQueryParamsInput
} from '@/lib/staffListQuery'
import { useSessionStore } from '@/features/session/store'

export interface StaffPageSummary {
  id: string
  title: string
  body: string
  notes: string
  createdAt: string
  updatedAt: string
  publishedAt: string
  isPinned: boolean
  isPublic: boolean
  mailScheduled: boolean
  viewableTags: string[]
  documentIds: string[]
  documents: StaffPageDocument[]
}

export type StaffPageDetail = StaffPageSummary

export interface MutateStaffPagePayload {
  title: string
  body: string
  notes: string
  isPinned: boolean
  isPublic: boolean
  viewableTags: string[]
  documentIds: string[]
  sendEmails: boolean
  /** `null` publishes immediately; an RFC 3339 timestamp schedules the publication. */
  publishedAt: string | null
}

/** Publication state derived from `isPublic` and `publishedAt`. */
export type StaffPagePublishStatus = 'unpublished' | 'scheduled' | 'published'

/** Japanese label shown to staff for each publication state. */
export const staffPagePublishStatusLabels: Record<StaffPagePublishStatus, string> = {
  unpublished: '非公開',
  scheduled: '予約公開',
  published: '公開中'
}

/** Badge tone used for each publication state. */
export const staffPagePublishStatusTones: Record<StaffPagePublishStatus, 'muted' | 'warning' | 'success'> = {
  unpublished: 'muted',
  scheduled: 'warning',
  published: 'success'
}

/**
 * Resolves the publication state of a page.
 * A page is publicly visible only when it is public *and* its publish time has passed.
 */
export function resolveStaffPagePublishStatus(page: {
  isPublic: boolean
  publishedAt: string
}): StaffPagePublishStatus {
  if (!page.isPublic) {
    return 'unpublished'
  }

  const publishTime = Date.parse(page.publishedAt)
  return !Number.isNaN(publishTime) && publishTime > Date.now() ? 'scheduled' : 'published'
}

export interface StaffPageDocument {
  id: string
  name: string
  description: string
  isImportant: boolean
  extension: string
  sizeBytes: number
  updatedAt: string
  downloadUrl: string
}

type StaffPagesQueryInput = string | StaffListQueryParams | undefined

function normalizeStaffPagesQueryInput(input: StaffPagesQueryInput): StaffListQueryParams | undefined {
  if (typeof input === 'string') {
    return { query: input }
  }
  return input
}

export async function fetchStaffPages(query?: StaffPagesQueryInput) {
  return $api.queryData(
    'get',
    '/staff/pages',
    {
      headers: createJsonHeaders(),
      ...buildStaffListRequestParams(normalizeStaffPagesQueryInput(query))
    },
    parseStaffPages,
    {
      errorMessage: 'Failed to fetch staff pages'
    }
  )
}

export async function fetchStaffPage(pageId: string) {
  return $api.queryData(
    'get',
    '/staff/pages/{pageID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          pageID: pageId
        }
      }
    },
    parseStaffPageDetail,
    {
      errorMessage: 'Failed to fetch staff page'
    }
  )
}

export async function createStaffPage(payload: MutateStaffPagePayload, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/pages',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseStaffPageSummary,
    {
      errorMessage: 'Failed to create staff page',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff page')
      }
    }
  )
}

export async function updateStaffPage(pageId: string, payload: MutateStaffPagePayload, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/pages/{pageID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          pageID: pageId
        }
      },
      body: payload
    },
    parseStaffPageSummary,
    {
      errorMessage: 'Failed to update staff page',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff page')
      }
    }
  )
}

export async function patchStaffPagePin(pageId: string, isPinned: boolean, csrfToken: string) {
  return $api.mutationData(
    'patch',
    '/staff/pages/{pageID}/pin',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          pageID: pageId
        }
      },
      body: {
        isPinned
      }
    },
    parseStaffPageSummary,
    {
      errorMessage: 'Failed to update staff page pin'
    }
  )
}

export async function deleteStaffPage(pageId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/pages/{pageID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: {
        path: {
          pageID: pageId
        }
      }
    },
    {
      errorMessage: 'Failed to delete staff page'
    }
  )
}

export function useStaffPagesQuery(query: StaffListQueryParamsInput, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/pages',
    () => ({
      headers: createJsonHeaders(),
      ...buildStaffListRequestParams(query)
    }),
    parseStaffPages,
    {
      queryKey: computed(() => ['staff', 'pages', toValue(query)]),
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff pages'
    }
  )
}

export function useStaffPageDetailQuery(pageId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/pages/{pageID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          pageID: toValue(pageId)
        }
      }
    }),
    parseStaffPageDetail,
    {
      queryKey: computed(() => ['staff', 'pages', 'detail', toValue(pageId)]),
      enabled: computed(() => toValue(enabled) && toValue(pageId).trim().length > 0),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff page'
    }
  )
}

export function useCreateStaffPageMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffPagePayload) => createStaffPage(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'pages'] }),
        queryClient.invalidateQueries({ queryKey: ['pages'] })
      ])
    }
  })
}

export function useUpdateStaffPageMutation(pageId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: MutateStaffPagePayload) =>
      updateStaffPage(toValue(pageId), payload, sessionStore.csrfToken),
    onSuccess: async (updatedPage) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'pages'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'pages', 'detail', updatedPage.id]
        }),
        queryClient.invalidateQueries({ queryKey: ['pages'] })
      ])
    }
  })
}

export function usePatchStaffPagePinMutation(pageId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (isPinned: boolean) => patchStaffPagePin(toValue(pageId), isPinned, sessionStore.csrfToken),
    onSuccess: async (updatedPage) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'pages'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'pages', 'detail', updatedPage.id]
        }),
        queryClient.invalidateQueries({ queryKey: ['pages'] })
      ])
    }
  })
}

export function usePatchStaffPagePinByIdMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async ({ pageId, isPinned }: { pageId: string; isPinned: boolean }) =>
      patchStaffPagePin(pageId, isPinned, sessionStore.csrfToken),
    onSuccess: async (updatedPage) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'pages'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'pages', 'detail', updatedPage.id]
        }),
        queryClient.invalidateQueries({ queryKey: ['pages'] })
      ])
    }
  })
}

export function useDeleteStaffPageMutation(pageId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => deleteStaffPage(toValue(pageId), sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'pages'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'pages', 'detail', toValue(pageId)]
        }),
        queryClient.invalidateQueries({ queryKey: ['pages'] })
      ])
    }
  })
}

export function useDeleteStaffPageByIdMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (pageId: string) => deleteStaffPage(pageId, sessionStore.csrfToken),
    onSuccess: async (_result, pageId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff', 'pages'] }),
        queryClient.invalidateQueries({
          queryKey: ['staff', 'pages', 'detail', pageId]
        }),
        queryClient.invalidateQueries({ queryKey: ['pages'] })
      ])
    }
  })
}

export function useStaffPageForm() {
  return ref<MutateStaffPagePayload>({
    title: '',
    body: '',
    notes: '',
    isPinned: false,
    isPublic: true,
    viewableTags: [],
    documentIds: [],
    sendEmails: false,
    publishedAt: null
  })
}

export function extractStaffPageValidationMessage(error: unknown) {
  const validation = unwrapValidationError(error)
  if (!validation) {
    return 'お知らせの保存に失敗しました。'
  }

  let hasPublishedAtError = false
  for (const [field, messages] of Object.entries(validation.errors)) {
    if (field === 'publishedAt' && messages.length > 0) {
      hasPublishedAtError = true
    }
    if (field !== 'publishedAt' && messages.length > 0) {
      return messages[0]
    }
  }

  return hasPublishedAtError ? '' : 'お知らせの保存に失敗しました。'
}

/** Returns the server-side validation message for the publish time field, or an empty string. */
export function extractStaffPagePublishedAtError(error: unknown) {
  return unwrapValidationError(error)?.errors.publishedAt?.[0] ?? ''
}

export function buildStaffPagesExportUrl() {
  return buildApiUrl('/staff/pages/export.csv')
}

export function parseStaffPageTags(value: string) {
  return parseTagString(value)
}

export function formatStaffPageTags(tags: string[]) {
  return formatTags(tags)
}

function parseStaffPages(value: unknown): StaffPageSummary[] {
  return parseArrayWithSchema(staffPageSummarySchema, value, 'staff pages')
}

function parseStaffPageSummary(value: unknown): StaffPageSummary {
  return parseWithSchema(staffPageSummarySchema, value, 'staff page')
}

function parseStaffPageDetail(value: unknown): StaffPageDetail {
  return parseWithSchema(staffPageDetailSchema, value, 'staff page detail')
}
