import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { z } from 'zod'
import { createJsonHeaders, $api, $apiSuspense } from '@/lib/api/client'
import {
  pageDetailSchema,
  parseWithSchema,
  publicConfigSchema,
  publicHomeDocumentSchema,
  publicHomePageSchema,
  publicHomeSchema
} from '@/lib/api/schema'
import { useQuery } from '@tanstack/vue-query'

export type PublicHome = z.infer<typeof publicHomeSchema>

export function usePublicConfigQuery() {
  return $api.useQueryData(
    'get',
    '/public/config',
    { headers: createJsonHeaders() },
    (value) => parseWithSchema(publicConfigSchema, value, 'public config'),
    { queryKey: computed(() => ['public', 'config']) },
    { errorMessage: 'Failed to fetch public config' }
  )
}

export async function fetchPublicHome() {
  return $api.queryData(
    'get',
    '/public/home',
    {
      headers: createJsonHeaders()
    },
    parsePublicHome,
    {
      errorMessage: 'Failed to fetch public home'
    }
  )
}

export async function fetchPublicPages() {
  return $api.queryData(
    'get',
    '/public/pages',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(z.array(publicHomePageSchema), value, 'public pages'),
    {
      errorMessage: 'Failed to fetch public pages'
    }
  )
}

export async function fetchPublicPage(pageId: string) {
  return $api.queryData(
    'get',
    '/public/pages/{pageID}',
    {
      headers: createJsonHeaders(),
      params: {
        path: {
          pageID: pageId
        }
      }
    },
    (value) => parseWithSchema(publicPageDetailSchema, value, 'public page detail'),
    {
      errorMessage: 'Failed to fetch public page'
    }
  )
}

export async function fetchPublicDocuments() {
  return $api.queryData(
    'get',
    '/public/documents',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(z.array(publicHomeDocumentSchema), value, 'public documents'),
    {
      errorMessage: 'Failed to fetch public documents'
    }
  )
}

export function usePublicHomeQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/public/home',
    {
      headers: createJsonHeaders()
    },
    parsePublicHome,
    {
      queryKey: computed(() => ['public', 'home']),
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch public home'
    }
  )
}

export function usePublicPagesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => ['public', 'pages']),
    queryFn: fetchPublicPages,
    enabled: computed(() => toValue(enabled)),
    retry: false
  })
}

export function usePublicPageDetailQuery(pageId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => ['public', 'pages', 'detail', toValue(pageId)]),
    queryFn: () => fetchPublicPage(toValue(pageId)),
    enabled: computed(() => toValue(enabled) && toValue(pageId).trim().length > 0),
    retry: false
  })
}

export function usePublicDocumentsQuery(enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => ['public', 'documents']),
    queryFn: fetchPublicDocuments,
    enabled: computed(() => toValue(enabled)),
    retry: false
  })
}

function parsePublicHome(value: unknown): PublicHome {
  return parseWithSchema(publicHomeSchema, value, 'public home')
}

const publicPageDetailSchema = pageDetailSchema

// Suspense-oriented query hooks.
// Callers should `await query.suspense()` in async setup under a <Suspense> boundary.

export function useSuspensePublicPagesQuery() {
  return $apiSuspense.useSuspenseQueryData(
    'get',
    '/public/pages',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(z.array(publicHomePageSchema), value, 'public pages'),
    {
      queryKey: ['public', 'pages'],
      retry: false
    },
    {
      errorMessage: 'Failed to fetch public pages'
    }
  )
}

export function useSuspensePublicPageDetailQuery(pageId: MaybeRefOrGetter<string>) {
  return $apiSuspense.useSuspenseQueryData(
    'get',
    '/public/pages/{pageID}',
    () => ({
      headers: createJsonHeaders(),
      params: {
        path: {
          pageID: toValue(pageId)
        }
      }
    }),
    (value) => parseWithSchema(publicPageDetailSchema, value, 'public page detail'),
    {
      queryKey: computed(() => ['public', 'pages', 'detail', toValue(pageId)]),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch public page'
    }
  )
}

export function useSuspensePublicDocumentsQuery() {
  return $apiSuspense.useSuspenseQueryData(
    'get',
    '/public/documents',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(z.array(publicHomeDocumentSchema), value, 'public documents'),
    {
      queryKey: ['public', 'documents'],
      retry: false
    },
    {
      errorMessage: 'Failed to fetch public documents'
    }
  )
}
