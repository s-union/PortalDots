import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { STALE_TIME } from '@/lib/api/cacheConfig'
import { parseWithSchema, parseArrayWithSchema, staffTagSchema } from '@/lib/api/schema'
import { parseValidationError } from '@/lib/api/validation'
import { buildStaffListRequestParams, type StaffListQueryParamsInput } from '@/lib/staffListQuery'
import { useStaffMasterMutation } from './shared'
import { type TagColor } from '@/lib/tagColor'
import * as z from 'zod'

export type StaffTag = z.infer<typeof staffTagSchema>

export interface StaffTagMutationInput {
  name: string
  color: TagColor
}

export function staffTagColorMap(tags: StaffTag[]): Record<string, string> {
  return Object.fromEntries(tags.map((tag) => [tag.name, tag.color]))
}

export async function fetchStaffTags(params?: StaffListQueryParamsInput) {
  return $api.queryData(
    'get',
    '/staff/tags',
    {
      headers: createJsonHeaders(),
      ...buildStaffListRequestParams(params)
    },
    parseStaffTags,
    {
      errorMessage: 'Failed to fetch staff tags'
    }
  )
}

export async function createStaffTag(input: StaffTagMutationInput, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/tags',
    {
      headers: createJsonHeaders(csrfToken),
      body: input
    },
    parseStaffTag,
    {
      errorMessage: 'Failed to create staff tag',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff tag')
      }
    }
  )
}

export async function updateStaffTag(tagId: string, input: StaffTagMutationInput, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/tags/{tagID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: { path: { tagID: tagId } },
      body: input
    },
    parseStaffTag,
    {
      errorMessage: 'Failed to update staff tag',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff tag')
      }
    }
  )
}

export async function deleteStaffTag(tagId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/tags/{tagID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: { path: { tagID: tagId } }
    },
    {
      errorMessage: 'Failed to delete staff tag'
    }
  )
}

export function useStaffTagsQuery(enabled: MaybeRefOrGetter<boolean>, params?: StaffListQueryParamsInput) {
  return $api.useQueryData(
    'get',
    '/staff/tags',
    () => ({
      headers: createJsonHeaders(),
      ...buildStaffListRequestParams(params)
    }),
    parseStaffTags,
    {
      queryKey: computed(() => ['staff', 'tags', toValue(params)]),
      enabled: computed(() => toValue(enabled)),
      retry: false,
      staleTime: STALE_TIME.MASTER_DATA
    },
    {
      errorMessage: 'Failed to fetch staff tags'
    }
  )
}

export const useCreateStaffTagMutation = () =>
  useStaffMasterMutation(
    (input: StaffTagMutationInput, csrfToken: string) => createStaffTag(input, csrfToken),
    ['staff', 'tags']
  )

export const useUpdateStaffTagMutation = () =>
  useStaffMasterMutation(
    (payload: StaffTag, csrfToken: string) =>
      updateStaffTag(payload.id, { name: payload.name, color: payload.color }, csrfToken),
    ['staff', 'tags']
  )

export const useDeleteStaffTagMutation = () =>
  useStaffMasterMutation((tagId: string, csrfToken: string) => deleteStaffTag(tagId, csrfToken), ['staff', 'tags'])

function parseStaffTags(value: unknown): StaffTag[] {
  return parseArrayWithSchema(staffTagSchema, value, 'staff tags')
}

function parseStaffTag(value: unknown): StaffTag {
  return parseWithSchema(staffTagSchema, value, 'staff tag')
}
