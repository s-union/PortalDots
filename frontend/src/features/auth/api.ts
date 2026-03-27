import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { authVerificationStatusSchema, parseWithSchema, staffVerifyRequestResultSchema } from '@/lib/api/schema'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { fetchSessionBootstrap } from '@/features/session/api'
import { useSessionStore } from '@/features/session/store'

interface LoginPayload {
  loginId: string
  password: string
  remember?: boolean
}

export interface RegisterPayload {
  studentId: string
  univemailLocalPart: string
  univemailDomainPart: string
  name: string
  nameYomi: string
  contactEmail: string
  phoneNumber: string
  password: string
  passwordConfirmation: string
}

export interface AuthVerificationStatus {
  userId: string
  displayName: string
  completed: boolean
  items: {
    type: 'email' | 'univemail'
    label: string
    address: string
    verified: boolean
  }[]
}

export interface AuthVerifyRequestResult {
  deliveryMode: 'mock'
  message: string
  verifyCode: string
}

export async function login(payload: LoginPayload) {
  await $api.noContentMutation(
    'post',
    '/auth/login',
    {
      headers: createJsonHeaders(),
      body: payload
    },
    {
      errorMessage: 'Failed to login',
      errorParsers: {
        422: (error) => parseValidationError(error, 'auth')
      }
    }
  )
}

export async function logout(csrfToken: string) {
  await $api.noContentMutation(
    'post',
    '/auth/logout',
    {
      headers: createJsonHeaders(csrfToken)
    },
    {
      errorMessage: 'Failed to logout'
    }
  )
}

export async function register(payload: RegisterPayload) {
  await $api.noContentMutation(
    'post',
    '/auth/register',
    {
      headers: createJsonHeaders(),
      body: payload
    },
    {
      errorMessage: 'Failed to register',
      errorParsers: {
        422: (error) => parseValidationError(error, 'register')
      }
    }
  )
}

export async function fetchAuthVerificationStatus() {
  return $api.queryData(
    'get',
    '/auth/verification',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(authVerificationStatusSchema, value, 'auth verification status'),
    {
      errorMessage: 'Failed to fetch auth verification status'
    }
  )
}

export async function requestAuthVerification(type: 'email' | 'univemail', csrfToken: string) {
  return $api.mutationData(
    'post',
    '/auth/verification/request',
    {
      headers: createJsonHeaders(csrfToken),
      body: { type }
    },
    (value) => parseWithSchema(staffVerifyRequestResultSchema, value, 'auth verification request'),
    {
      errorMessage: 'Failed to request auth verification',
      errorParsers: {
        422: (error) => parseValidationError(error, 'auth verification')
      }
    }
  )
}

export async function confirmAuthVerification(type: 'email' | 'univemail', verifyCode: string, csrfToken: string) {
  await $api.noContentMutation(
    'post',
    '/auth/verification/confirm',
    {
      headers: createJsonHeaders(csrfToken),
      body: { type, verifyCode }
    },
    {
      errorMessage: 'Failed to confirm auth verification',
      errorParsers: {
        422: (error) => parseValidationError(error, 'auth verification')
      }
    }
  )
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: LoginPayload) =>
      $api.noContentMutation(
        'post',
        '/auth/login',
        {
          headers: createJsonHeaders(),
          body: payload
        },
        {
          errorMessage: 'Failed to login',
          errorParsers: {
            422: (error) => parseValidationError(error, 'auth')
          }
        }
      ),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
    }
  })
}

export function useLogoutMutation() {
  const sessionStore = useSessionStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      $api.noContentMutation(
        'post',
        '/auth/logout',
        {
          headers: createJsonHeaders(sessionStore.csrfToken)
        },
        {
          errorMessage: 'Failed to logout'
        }
      ),
    onSuccess: () => {
      sessionStore.reset()
      queryClient.clear()
    }
  })
}

export function useRegisterMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: RegisterPayload) =>
      $api.noContentMutation(
        'post',
        '/auth/register',
        {
          headers: createJsonHeaders(),
          body: payload
        },
        {
          errorMessage: 'Failed to register',
          errorParsers: {
            422: (error) => parseValidationError(error, 'register')
          }
        }
      ),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
    }
  })
}

export function useAuthVerificationStatusQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: ['auth', 'verification'],
    queryFn: fetchAuthVerificationStatus,
    enabled: computed(() => toValue(enabled)),
    retry: false
  })
}

export function useRequestAuthVerificationMutation() {
  const sessionStore = useSessionStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (type: 'email' | 'univemail') => requestAuthVerification(type, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'verification'] })
    }
  })
}

export function useConfirmAuthVerificationMutation() {
  const sessionStore = useSessionStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { type: 'email' | 'univemail'; verifyCode: string }) =>
      confirmAuthVerification(payload.type, payload.verifyCode, sessionStore.csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth', 'verification'] }),
        queryClient.invalidateQueries({ queryKey: ['session', 'bootstrap'] })
      ])
    }
  })
}

export function extractFirstErrorMessage(error: unknown) {
  return extractValidationMessage(error, 'ログインに失敗しました。')
}
