import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, parseArrayWithSchema, staffPlaceSchema, type PlaceId } from '@/lib/api/schema'
import { parseValidationError } from '@/lib/api/validation'
import { buildStaffListRequestParams, type StaffListQueryParamsInput } from '@/lib/staffListQuery'
import { useStaffMasterMutation } from './shared'

export interface StaffPlace {
  id: PlaceId
  name: string
  type: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface StaffPlaceFormInput {
  name: string
  type: number
  notes: string
}

export async function fetchStaffPlaces(params?: StaffListQueryParamsInput) {
  return $api.queryData(
    'get',
    '/staff/places',
    {
      headers: createJsonHeaders(),
      ...buildStaffListRequestParams(params)
    },
    parseStaffPlaces,
    {
      errorMessage: 'Failed to fetch staff places'
    }
  )
}

export async function createStaffPlace(payload: StaffPlaceFormInput, csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/places',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseStaffPlace,
    {
      errorMessage: 'Failed to create staff place',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff place')
      }
    }
  )
}

export async function updateStaffPlace(payload: StaffPlace, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/places/{placeID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: { path: { placeID: payload.id } },
      body: {
        name: payload.name,
        type: payload.type,
        notes: payload.notes
      }
    },
    parseStaffPlace,
    {
      errorMessage: 'Failed to update staff place',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff place')
      }
    }
  )
}

export async function deleteStaffPlace(placeId: string, csrfToken: string) {
  await $api.noContentMutation(
    'delete',
    '/staff/places/{placeID}',
    {
      headers: createJsonHeaders(csrfToken),
      params: { path: { placeID: placeId } }
    },
    {
      errorMessage: 'Failed to delete staff place'
    }
  )
}

export function useStaffPlacesQuery(enabled: MaybeRefOrGetter<boolean>, params?: StaffListQueryParamsInput) {
  return $api.useQueryData(
    'get',
    '/staff/places',
    () => ({
      headers: createJsonHeaders(),
      ...buildStaffListRequestParams(params)
    }),
    parseStaffPlaces,
    {
      queryKey: computed(() => ['staff', 'places', toValue(params)]),
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff places'
    }
  )
}

export const useCreateStaffPlaceMutation = () =>
  useStaffMasterMutation(
    (payload: StaffPlaceFormInput, csrfToken: string) => createStaffPlace(payload, csrfToken),
    ['staff', 'places']
  )

export const useUpdateStaffPlaceMutation = () =>
  useStaffMasterMutation(
    (payload: StaffPlace, csrfToken: string) => updateStaffPlace(payload, csrfToken),
    ['staff', 'places']
  )

export const useDeleteStaffPlaceMutation = () =>
  useStaffMasterMutation(
    (placeId: string, csrfToken: string) => deleteStaffPlace(placeId, csrfToken),
    ['staff', 'places']
  )

export function buildDeleteStaffPlaceConfirmMessage(placeName: string) {
  return `場所「${placeName}」を削除しますか？\n\n• 企画の使用場所として「${placeName}」が設定されている場合、その設定は解除されます。企画自体は削除されません`
}

function parseStaffPlaces(value: unknown): StaffPlace[] {
  return parseArrayWithSchema(staffPlaceSchema, value, 'staff places')
}

function parseStaffPlace(value: unknown): StaffPlace {
  return parseWithSchema(staffPlaceSchema, value, 'staff place')
}
