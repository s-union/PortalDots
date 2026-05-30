<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { usePagesQuery, fetchPages } from '@/features/pages/api'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { calculateTotalPages } from '@/lib/pagination'
import LoadingState from '@/components/ui/LoadingState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { routePositiveInteger, routeString } from '@/lib/routeQuery'
import { usePrefetchNextPage } from '@/lib/api/prefetch'

const route = useRoute()
const router = useRouter()
const searchQuery = ref(routeString(route.query.query))
const page = computed(() => routePositiveInteger(route.query.page))
const pageSize = 10
const pagesQuery = usePagesQuery(
  searchQuery,
  computed(() => ({ page: page.value, pageSize }))
)
const pageList = computed(() => pagesQuery.data.value ?? { items: [], page: 1, pageSize, total: 0 })
const shouldShowPagination = computed(() => calculateTotalPages(pageList.value.total, pageList.value.pageSize) > 1)
const totalPages = computed(() => calculateTotalPages(pageList.value.total, pageList.value.pageSize))

usePrefetchNextPage(
  page,
  totalPages,
  (nextPage) => ({
    queryKey: ['pages', searchQuery.value, { page: nextPage, pageSize }],
    queryFn: () => fetchPages(searchQuery.value, { page: nextPage, pageSize })
  }),
  [searchQuery]
)

watch(
  () => route.query.query,
  (value) => {
    searchQuery.value = routeString(value)
  }
)

async function handleSearchSubmit() {
  const normalizedQuery = searchQuery.value.trim()
  await router.replace({
    query: normalizedQuery === '' ? {} : { query: normalizedQuery }
  })
}

async function handleSearchReset() {
  searchQuery.value = ''
  await router.replace({ query: {} })
}

async function handlePageChange(nextPage: number) {
  await router.replace({
    query: {
      ...(searchQuery.value.trim() === '' ? {} : { query: searchQuery.value.trim() }),
      ...(nextPage > 1 ? { page: String(nextPage) } : {})
    }
  })
}
</script>

<template>
  <PageLayout spacious>
    <div class="rounded border border-border bg-surface p-6 shadow-lv1">
      <h2 class="text-xl font-semibold text-body">お知らせ</h2>

      <form class="mt-4 flex flex-wrap gap-3" @submit.prevent="handleSearchSubmit">
        <input
          v-model="searchQuery"
          class="min-w-64 flex-1"
          name="query"
          placeholder="お知らせを検索..."
          type="search"
        />
        <BaseButton variant="primary" size="lg" weight="bold" type="submit"> 検索 </BaseButton>
      </form>

      <div v-if="searchQuery.trim() !== ''" class="mt-3">
        <button class="text-sm font-semibold text-muted" type="button" @click="handleSearchReset">
          検索をリセット
        </button>
      </div>
    </div>

    <LoadingState v-if="pagesQuery.isPending.value" />

    <div
      v-else-if="pageList.items.length === 0"
      class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
    >
      <p class="text-base">
        {{ searchQuery.trim() === '' ? 'お知らせはまだありません' : '検索結果が見つかりませんでした' }}
      </p>
      <p v-if="searchQuery.trim() !== ''" class="mt-3 text-sm">
        入力するキーワードを変えて、再度検索をお試しください。
      </p>
    </div>

    <ListPanel v-else legacy overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink v-for="page in pageList.items" :key="page.id" legacy :to="`/workspace/pages/${page.id}`">
          <template #title>{{ page.title }}</template>
          <template #prefix>
            <StatusBadge :tone="page.isLimited ? 'primary' : 'muted'" appearance="outlined">
              {{ page.isLimited ? '限定公開' : '全員に公開' }}
            </StatusBadge>
          </template>
          <template #suffix>
            <div class="flex items-center gap-2">
              <StatusBadge v-if="page.isNew" tone="danger" size="sm">NEW</StatusBadge>
              <StatusBadge v-if="page.isUnread" tone="primary" size="sm">未読</StatusBadge>
            </div>
          </template>
          <template #meta>{{ formatDateTimeUpdated(page.updatedAt) }}</template>
          {{ page.summary }}
        </ListItemLink>
      </div>
      <PaginationFooter
        v-if="shouldShowPagination"
        :bordered="false"
        :page="pageList.page"
        :page-size="pageList.pageSize"
        :total="pageList.total"
        @update:page="handlePageChange"
      />
    </ListPanel>
  </PageLayout>
</template>
