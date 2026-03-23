import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { buildApiUrl, createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, staffPlaceSchema } from '@/lib/api/schema'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

export interface StaffPlace {
  id: string
  name: string
  type: number
  notes: string
}

export async function fetchStaffPlaces() {
  return $api.queryData(
    'get',
    '/staff/places',
    {
      headers: createJsonHeaders()
    },
    parseStaffPlaces,
    {
      errorMessage: 'Failed to fetch staff places'
    }
  )
}

export async function createStaffPlace(payload: Omit<StaffPlace, 'id'>, csrfToken: string) {
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

export function useStaffPlacesQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/places',
    {
      headers: createJsonHeaders()
    },
    parseStaffPlaces,
    {
      queryKey: ['staff', 'places'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff places'
    }
  )
}

export function useCreateStaffPlaceMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()
  return useMutation({
    mutationFn: async (payload: Omit<StaffPlace, 'id'>) => createStaffPlace(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'places'] })
    }
  })
}

export function useUpdateStaffPlaceMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()
  return useMutation({
    mutationFn: async (payload: StaffPlace) => updateStaffPlace(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'places'] })
    }
  })
}

export function useDeleteStaffPlaceMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()
  return useMutation({
    mutationFn: async (placeId: string) => deleteStaffPlace(placeId, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'places'] })
    }
  })
}

export function extractStaffPlaceValidationMessage(error: unknown) {
  return extractValidationMessage(error, '場所の保存に失敗しました。')
}

export function buildDeleteStaffPlaceConfirmMessage(placeName: string) {
  return `場所「${placeName}」を削除しますか？\n\n• 企画の使用場所として「${placeName}」が設定されている場合、その設定は解除されます。企画自体は削除されません`
}

export function placeTypeLabel(placeType: number) {
  switch (placeType) {
    case 1:
      return '屋内'
    case 2:
      return '屋外'
    case 3:
      return '特殊場所'
    default:
      return String(placeType)
  }
}

export function buildStaffPlacesExportUrl() {
  return buildApiUrl('/staff/places/export')
}

function parseStaffPlaces(value: unknown): StaffPlace[] {
  return parseWithSchema(staffPlaceSchema.array(), value, 'staff places')
}

function parseStaffPlace(value: unknown): StaffPlace {
  return parseWithSchema(staffPlaceSchema, value, 'staff place')
}
