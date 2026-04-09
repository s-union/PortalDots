import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api, $apiSuspense } from '@/lib/api/client'
import {
  authVerificationStatusSchema,
  passwordResetStartResultSchema,
  passwordResetVerificationSchema,
  parseWithSchema,
  registrationStartResultSchema,
  registrationVerificationSchema,
  staffVerifyRequestResultSchema
} from '@/lib/api/schema'
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

export interface StartRegistrationPayload {
  univemailLocalPart: string
}

export interface RegistrationStartResult {
  message: string
}

export interface VerifyRegistrationPayload {
  pendingRegistrationId: string
  token: string
}

export interface RegistrationVerificationResult {
  pendingRegistrationId: string
  univemail: string
  studentId: string
  verified: boolean
}

export interface StartPasswordResetPayload {
  loginId: string
}

export interface PasswordResetStartResult {
  message: string
}

export interface VerifyPasswordResetPayload {
  userId: string
  token: string
}

export interface PasswordResetVerificationResult {
  userId: string
  valid: boolean
}

export interface CompletePasswordResetPayload {
  userId: string
  token: string
  password: string
  passwordConfirmation: string
}

export interface CompleteRegistrationPayload {
  pendingRegistrationId: string
  token: string
  name: string
  nameYomi: string
  contactEmail?: string
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
  message: string
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

export async function startRegistration(payload: StartRegistrationPayload) {
  return $api.mutationData(
    'post',
    '/auth/register/start',
    {
      headers: createJsonHeaders(),
      body: payload
    },
    (value) => parseWithSchema(registrationStartResultSchema, value, 'registration start'),
    {
      errorMessage: 'Failed to start registration',
      errorParsers: {
        422: (error) => parseValidationError(error, 'register')
      }
    }
  )
}

export async function verifyRegistration(payload: VerifyRegistrationPayload) {
  return $api.mutationData(
    'post',
    '/auth/register/verify',
    {
      headers: createJsonHeaders(),
      body: payload
    },
    (value) => parseWithSchema(registrationVerificationSchema, value, 'registration verification'),
    {
      errorMessage: 'Failed to verify registration',
      errorParsers: {
        422: (error) => parseValidationError(error, 'register')
      }
    }
  )
}

export async function completeRegistration(payload: CompleteRegistrationPayload) {
  await $api.noContentMutation(
    'post',
    '/auth/register/complete',
    {
      headers: createJsonHeaders(),
      body: {
        ...payload,
        contactEmail: payload.contactEmail ?? ''
      }
    },
    {
      errorMessage: 'Failed to complete registration',
      errorParsers: {
        422: (error) => parseValidationError(error, 'register')
      }
    }
  )
}

export async function startPasswordReset(payload: StartPasswordResetPayload) {
  return $api.mutationData(
    'post',
    '/auth/password/reset/start',
    {
      headers: createJsonHeaders(),
      body: payload
    },
    (value) => parseWithSchema(passwordResetStartResultSchema, value, 'password reset start'),
    {
      errorMessage: 'Failed to start password reset',
      errorParsers: {
        422: (error) => parseValidationError(error, 'password reset')
      }
    }
  )
}

export async function verifyPasswordReset(payload: VerifyPasswordResetPayload) {
  return $api.mutationData(
    'post',
    '/auth/password/reset/verify',
    {
      headers: createJsonHeaders(),
      body: payload
    },
    (value) => parseWithSchema(passwordResetVerificationSchema, value, 'password reset verification'),
    {
      errorMessage: 'Failed to verify password reset token',
      errorParsers: {
        422: (error) => parseValidationError(error, 'password reset')
      }
    }
  )
}

export async function completePasswordReset(payload: CompletePasswordResetPayload) {
  await $api.noContentMutation(
    'post',
    '/auth/password/reset/complete',
    {
      headers: createJsonHeaders(),
      body: payload
    },
    {
      errorMessage: 'Failed to complete password reset',
      errorParsers: {
        422: (error) => parseValidationError(error, 'password reset')
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

export function useStartRegistrationMutation() {
  return useMutation({
    mutationFn: async (payload: StartRegistrationPayload) => startRegistration(payload)
  })
}

export function useVerifyRegistrationMutation() {
  return useMutation({
    mutationFn: async (payload: VerifyRegistrationPayload) => verifyRegistration(payload)
  })
}

export function useCompleteRegistrationMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: CompleteRegistrationPayload) => completeRegistration(payload),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
    }
  })
}

export function useStartPasswordResetMutation() {
  return useMutation<PasswordResetStartResult, unknown, StartPasswordResetPayload>({
    mutationFn: async (payload: StartPasswordResetPayload) => startPasswordReset(payload)
  })
}

export function useVerifyPasswordResetMutation() {
  return useMutation<PasswordResetVerificationResult, unknown, VerifyPasswordResetPayload>({
    mutationFn: async (payload: VerifyPasswordResetPayload) => verifyPasswordReset(payload)
  })
}

export function useCompletePasswordResetMutation() {
  return useMutation<void, unknown, CompletePasswordResetPayload>({
    mutationFn: async (payload: CompletePasswordResetPayload) => completePasswordReset(payload)
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

export function useSuspenseAuthVerificationStatusQuery() {
  return $apiSuspense.useSuspenseQueryData(
    'get',
    '/auth/verification',
    {
      headers: createJsonHeaders()
    },
    (value) => parseWithSchema(authVerificationStatusSchema, value, 'auth verification status'),
    {
      queryKey: ['auth', 'verification'],
      retry: false
    },
    {
      errorMessage: 'Failed to fetch auth verification status'
    }
  )
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
