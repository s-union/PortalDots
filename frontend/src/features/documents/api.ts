import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { parsePaginatedResult, type PaginatedResult } from '@/lib/api/pagination'
import { documentSummarySchema, parseWithSchema } from '@/lib/api/schema'
import { useSessionStore } from '@/features/session/store'

export interface DocumentSummary {
  id: string
  name: string
  description: string
  isImportant: boolean
  isNew: boolean
  extension: string
  sizeBytes: number
  updatedAt: string
  downloadUrl: string
}

export interface DocumentsPagination {
  page: number
  pageSize: number
}

export type DocumentPage = PaginatedResult<DocumentSummary>

export async function fetchDocuments(pagination: DocumentsPagination) {
  return $api.queryData(
    'get',
    '/documents',
    {
      headers: createJsonHeaders(),
      params: {
        query: {
          page: pagination.page,
          pageSize: pagination.pageSize
        }
      }
    },
    (value) => parsePaginatedResult(value, parseDocumentSummary, 'documents'),
    {
      errorMessage: 'Failed to fetch documents'
    }
  )
}

export function useDocumentsQuery() {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/documents',
    {
      headers: createJsonHeaders(),
      params: {
        query: {
          page: 1,
          pageSize: 10
        }
      }
    },
    (value) => parsePaginatedResult(value, parseDocumentSummary, 'documents'),
    {
      queryKey: computed(() => ['documents', { page: 1, pageSize: 10 }]),
      enabled: computed(() => sessionStore.isAuthenticated),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch documents'
    }
  )
}

export function useDocumentsPageQuery(pagination: MaybeRefOrGetter<DocumentsPagination>) {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/documents',
    () => ({
      headers: createJsonHeaders(),
      params: {
        query: {
          page: toValue(pagination).page,
          pageSize: toValue(pagination).pageSize
        }
      }
    }),
    (value) => parsePaginatedResult(value, parseDocumentSummary, 'documents'),
    {
      queryKey: computed(() => ['documents', toValue(pagination)]),
      enabled: computed(() => sessionStore.isAuthenticated),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch documents'
    }
  )
}

function parseDocumentSummary(value: unknown): DocumentSummary {
  return parseWithSchema(documentSummarySchema, value, 'documents')
}
