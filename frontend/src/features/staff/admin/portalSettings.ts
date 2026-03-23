import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, staffPortalSettingsSchema } from '@/lib/api/schema'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

export interface StaffPortalSettings {
  appName: string
  portalDescription: string
  appUrl: string
  appForceHttps: boolean
  portalAdminName: string
  portalContactEmail: string
  portalUnivemailLocalPart: string
  portalUnivemailDomainPart: string
  portalStudentIdName: string
  portalUnivemailName: string
  portalPrimaryColorH: number
  portalPrimaryColorS: number
  portalPrimaryColorL: number
}

export async function fetchStaffPortalSettings() {
  return $api.queryData(
    'get',
    '/staff/portal-settings',
    {
      headers: createJsonHeaders()
    },
    parseStaffPortalSettings,
    {
      errorMessage: 'Failed to fetch staff portal settings'
    }
  )
}

export async function updateStaffPortalSettings(payload: StaffPortalSettings, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/staff/portal-settings',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseStaffPortalSettings,
    {
      errorMessage: 'Failed to update staff portal settings',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff portal settings')
      }
    }
  )
}

export function useStaffPortalSettingsQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/portal-settings',
    {
      headers: createJsonHeaders()
    },
    parseStaffPortalSettings,
    {
      queryKey: ['staff', 'portal-settings'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff portal settings'
    }
  )
}

export function useUpdateStaffPortalSettingsMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: StaffPortalSettings) => updateStaffPortalSettings(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'portal-settings'] })
    }
  })
}

export function extractStaffPortalSettingsValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'Portal 設定の保存に失敗しました。')
}

function parseStaffPortalSettings(value: unknown): StaffPortalSettings {
  return parseWithSchema(staffPortalSettingsSchema, value, 'staff portal settings')
}
