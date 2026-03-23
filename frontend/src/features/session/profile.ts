import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createJsonHeaders, $api } from '@/lib/api/client'
import { parseWithSchema, sessionUserSchema } from '@/lib/api/schema'
import { fetchSessionBootstrap } from '@/features/session/api'
import { useSessionStore } from '@/features/session/store'
import { extractValidationMessage, parseValidationError } from '@/lib/api/validation'

interface UpdateProfilePayload {
  displayName: string
}

interface SessionUser {
  id: string
  displayName: string
}

export async function updateProfile(payload: UpdateProfilePayload, csrfToken: string) {
  return $api.mutationData(
    'put',
    '/session/profile',
    {
      headers: createJsonHeaders(csrfToken),
      body: payload
    },
    parseSessionUser,
    {
      errorMessage: 'Failed to update profile',
      errorParsers: {
        422: (error) => parseValidationError(error, 'profile')
      }
    }
  )
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => updateProfile(payload, sessionStore.csrfToken),
    onSuccess: async () => {
      const session = await fetchSessionBootstrap()
      sessionStore.hydrate(session)
      queryClient.setQueryData(['session', 'bootstrap'], session)
    }
  })
}

export function extractProfileValidationMessage(error: unknown) {
  return extractValidationMessage(error, 'ユーザー設定の更新に失敗しました。')
}

function parseSessionUser(value: unknown): SessionUser {
  return parseWithSchema(sessionUserSchema, value, 'profile')
}
