import { useMutation } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'
import { useSessionStore } from '@/features/session/store'

interface UpdatePasswordPayload {
  currentPassword: string
  newPassword: string
}

export async function updatePassword(payload: UpdatePasswordPayload, csrfToken: string) {
  await $api.noContentMutation(
    'put',
    '/session/password',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    {
      errorMessage: 'Failed to update password',
      errorParsers: {
        422: (error) => parseValidationError(error, 'password')
      }
    }
  )
}

export function useUpdatePasswordMutation() {
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: UpdatePasswordPayload) => updatePassword(payload, sessionStore.csrfToken)
  })
}

export function extractPasswordValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'パスワードの更新に失敗しました。')
}
