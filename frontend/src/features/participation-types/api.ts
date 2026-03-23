import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import type { z } from 'zod'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, participationTypeSchema } from '@/lib/api/schema'

export type ParticipationType = z.infer<typeof participationTypeSchema>

export async function fetchParticipationTypes() {
  return $api.queryData(
    'get',
    '/participation-types',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(participationTypeSchema.array(), value, 'participation types'),
    {
      errorMessage: 'Failed to fetch participation types'
    }
  )
}

export function useParticipationTypesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/participation-types',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(participationTypeSchema.array(), value, 'participation types'),
    {
      queryKey: ['participation-types'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch participation types'
    }
  )
}
