import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { buildApiUrl, createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, staffPageDetailSchema, staffPageSummarySchema } from '@/lib/api/schema'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

export interface StaffPageSummary {
  id: string
  title: string
  notes: string
  createdAt: string
  updatedAt: string
  isPinned: boolean
  isPublic: boolean
  viewableTags: string[]
  documentIds: string[]
  documents: StaffPageDocument[]
}

export type StaffPageDetail = StaffPageSummary & {
  body: string
}

export interface MutateStaffPagePayload {
  title: string
  body: string
  notes: string
  isPinned: boolean
  isPublic: boolean
  viewableTags: string[]
  documentIds: string[]
  sendEmails: boolean
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

export async function fetchStaffPages(query = '') {
  const normalizedQuery = query.trim()

  return $api.queryData(
    'get',
    '/staff/pages',
    {
      headers: createJsonHeaders(),
      params: {
        query: normalizedQuery === '' ? {} : { query: normalizedQuery }
      }
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

export function useStaffPagesQuery(query: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/pages',
    () => {
      const normalizedQuery = toValue(query).trim()

      return {
        headers: createJsonHeaders(),
        params: {
          query: normalizedQuery === '' ? {} : { query: normalizedQuery }
        }
      }
    },
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
    sendEmails: false
  })
}

export function extractStaffPageValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'お知らせの保存に失敗しました。')
}

export function buildStaffPagesExportUrl() {
  return buildApiUrl('/staff/pages/export.csv')
}

export function parseStaffPageTags(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ]
}

export function formatStaffPageTags(tags: string[]) {
  return tags.join('\n')
}

function parseStaffPages(value: unknown): StaffPageSummary[] {
  return parseWithSchema(staffPageSummarySchema.array(), value, 'staff pages')
}

function parseStaffPageSummary(value: unknown): StaffPageSummary {
  return parseWithSchema(staffPageSummarySchema, value, 'staff page')
}

function parseStaffPageDetail(value: unknown): StaffPageDetail {
  return parseWithSchema(staffPageDetailSchema, value, 'staff page detail')
}
