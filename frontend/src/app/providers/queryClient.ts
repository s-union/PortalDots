import { QueryClient } from '@tanstack/vue-query'
import { GC_TIME } from '@/lib/api/cacheConfig'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: GC_TIME,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})
