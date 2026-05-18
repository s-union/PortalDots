import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useSessionStore } from '@/features/session/store'

export function useStaffMasterMutation<TData>(
  mutationFn: (data: TData, csrfToken: string) => Promise<unknown>,
  queryKey: string[]
) {
  const queryClient = useQueryClient()
  const sessionStore = useSessionStore()
  return useMutation({
    mutationFn: async (data: TData) => mutationFn(data, sessionStore.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
    }
  })
}
