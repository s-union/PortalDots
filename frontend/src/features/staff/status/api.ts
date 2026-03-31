import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, staffStatusSchema, staffVerifyRequestResultSchema } from '@/lib/api/schema'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

interface StaffStatus {
  allowed: boolean
  authorized: boolean
}

interface StaffVerifyRequestResult {
  deliveryMode: 'email' | 'mock'
  message: string
  verifyCode?: string | null
}

export async function fetchStaffStatus() {
  return $api.queryData(
    'get',
    '/staff/status',
    {
      headers: createJsonHeaders()
    },
    parseStaffStatus,
    {
      errorMessage: 'Failed to fetch staff status'
    }
  )
}

export async function requestStaffVerification(csrfToken: string) {
  return $api.mutationData(
    'post',
    '/staff/verify/request',
    {
      headers: createJsonHeaders(csrfToken)
    },
    parseStaffVerifyRequestResult,
    {
      errorMessage: 'Failed to request staff verification'
    }
  )
}

export async function confirmStaffVerification(verifyCode: string, csrfToken: string) {
  await $api.noContentMutation(
    'post',
    '/staff/verify/confirm',
    {
      headers: createJsonHeaders(csrfToken),
      body: { verifyCode }
    },
    {
      errorMessage: 'Failed to confirm staff verification',
      errorParsers: {
        422: (error) => parseValidationError(error, 'staff verification')
      }
    }
  )
}

export function useStaffStatusQuery(enabled: MaybeRefOrGetter<boolean>) {
  return $api.useQueryData(
    'get',
    '/staff/status',
    {
      headers: createJsonHeaders()
    },
    parseStaffStatus,
    {
      queryKey: ['staff', 'status'],
      enabled: computed(() => toValue(enabled)),
      retry: false
    },
    {
      errorMessage: 'Failed to fetch staff status'
    }
  )
}

export function useRequestStaffVerificationMutation() {
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async () => requestStaffVerification(sessionStore.csrfToken)
  })
}

export function useConfirmStaffVerificationMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (verifyCode: string) => confirmStaffVerification(verifyCode, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff', 'status'] })
    }
  })
}

export function extractStaffVerifyError(error: unknown) {
  return extractValidationMessage(error, 'スタッフ認証に失敗しました。')
}

function parseStaffStatus(value: unknown): StaffStatus {
  return parseWithSchema(staffStatusSchema, value, 'staff status')
}

function parseStaffVerifyRequestResult(value: unknown): StaffVerifyRequestResult {
  return parseWithSchema(staffVerifyRequestResultSchema, value, 'staff verify request')
}
