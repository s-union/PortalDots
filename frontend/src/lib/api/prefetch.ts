import { watch, type Ref, type ComputedRef } from 'vue'
import { useQueryClient, type QueryKey } from '@tanstack/vue-query'

export function usePrefetchNextPage<T>(
  currentPage: Ref<number> | ComputedRef<number>,
  totalPages: Ref<number> | ComputedRef<number>,
  buildNextQuery: (nextPage: number) => { queryKey: QueryKey; queryFn: () => Promise<T> },
  extraWatchSources: (Ref | ComputedRef)[] = []
) {
  const queryClient = useQueryClient()

  watch(
    [currentPage, totalPages, ...extraWatchSources],
    ([page, total]) => {
      const nextPage = page + 1
      if (nextPage > total) {
        return
      }

      const { queryKey, queryFn } = buildNextQuery(nextPage)
      void queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 30_000
      })
    },
    { immediate: true }
  )
}
