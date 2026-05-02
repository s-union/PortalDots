import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { pageDetailSchema, pageSummarySchema, paginatedResultSchema, parseWithSchema } from '@/lib/api/schema'
import { useSessionStore } from '@/features/session/store'

export interface PageSummary {
  id: string
  title: string
  summary: string
  isLimited: boolean
  isNew: boolean
  isUnread: boolean
  createdAt: string
  updatedAt: string
}

export interface PageDetail {
  id: string
  title: string
  body: string
  isLimited: boolean
  createdAt: string
  updatedAt: string
  documents: PageDocument[]
}

export interface PagesPagination {
  page: number
  pageSize: number
}

export interface PageListResult {
  items: PageSummary[]
  page: number
  pageSize: number
  total: number
}

export interface PageDocument {
  id: string
  name: string
  description: string
  isImportant: boolean
  extension: string
  sizeBytes: number
  updatedAt: string
  downloadUrl: string
}

export async function fetchPages(query = '', pagination: PagesPagination = { page: 1, pageSize: 10 }) {
  return $api.queryData(
    'get',
    '/pages',
    {
      headers: createJsonHeaders(),
      params: {
        query: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          ...(query.trim() !== '' ? { query: query.trim() } : {})
        }
      }
    },
    parsePages,
    {
      errorMessage: 'Failed to fetch pages'
    }
  )
}

export async function fetchPage(pageId: string) {
  return $api.queryData(
    'get',
    '/pages/{pageID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          pageID: pageId
        }
      }
    },
    parsePageDetail,
    {
      errorMessage: 'Failed to fetch page'
    }
  )
}

export function usePagesQuery(query: MaybeRefOrGetter<string>, pagination: MaybeRefOrGetter<PagesPagination>) {
  const sessionStore = useSessionStore()

  return useQuery({
    queryKey: computed(() => ['pages', sessionStore.currentCircle?.id ?? 'none', toValue(query), toValue(pagination)]),
    queryFn: () => fetchPages(toValue(query), toValue(pagination)),
    enabled: computed(() => sessionStore.isAuthenticated && sessionStore.currentCircle !== null),
    retry: false
  })
}

export function usePageDetailQuery(pageId: MaybeRefOrGetter<string>) {
  const sessionStore = useSessionStore()

  return $api.useQueryData(
    'get',
    '/pages/{pageID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          pageID: toValue(pageId)
        }
      }
    }),
    parsePageDetail,
    {
      queryKey: computed(() => ['pages', 'detail', toValue(pageId), sessionStore.currentCircle?.id ?? 'none']),
      enabled: computed(
        () => sessionStore.isAuthenticated && sessionStore.currentCircle !== null && toValue(pageId).trim().length > 0
      ),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch page'
    }
  )
}

function parsePages(value: unknown): PageListResult {
  return parseWithSchema(paginatedResultSchema(pageSummarySchema), value, 'pages')
}

function parsePageDetail(value: unknown): PageDetail {
  return parseWithSchema(pageDetailSchema, value, 'page detail')
}
