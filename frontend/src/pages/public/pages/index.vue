<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
    redirectWhenAuth: '/workspace/pages'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { usePublicPagesQuery } from '@/features/public-home/api'

const route = useRoute()
const router = useRouter()
const searchQuery = ref(String(route.query.query ?? ''))
const page = computed(() => Number.parseInt(String(route.query.page ?? '1'), 10) || 1)
const pageSize = 10
const pagesQuery = usePublicPagesQuery(
  computed(() => true),
  page,
  computed(() => pageSize),
  searchQuery
)
const pageList = computed(() => pagesQuery.data.value ?? { items: [], page: 1, pageSize, total: 0 })

watch(
  () => route.query.query,
  (value) => {
    searchQuery.value = String(value ?? '')
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
  <PageLayout>
    <div class="rounded border border-border bg-surface p-6 shadow-lv1">
      <h2 class="text-xl font-semibold text-body">お知らせ</h2>
      <p class="mt-2 text-sm text-muted">ゲスト向けに公開されているお知らせだけを表示します。</p>

      <form class="mt-4 flex flex-wrap gap-3" @submit.prevent="handleSearchSubmit">
        <input v-model="searchQuery" class="min-w-64 flex-1" name="query" placeholder="お知らせを検索…" type="search" />
        <button
          class="rounded bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
          type="submit"
        >
          検索
        </button>
      </form>

      <div v-if="String(route.query.query ?? '') !== ''" class="mt-3">
        <button class="text-sm font-semibold text-muted" type="button" @click="handleSearchReset">
          検索をリセット
        </button>
      </div>
    </div>

    <div v-if="pagesQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <div
      v-else-if="pageList.items.length === 0"
      class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
    >
      <p class="text-base">
        {{ String(route.query.query ?? '') === '' ? 'お知らせはまだありません' : '検索結果が見つかりませんでした' }}
      </p>
    </div>

    <ListPanel v-else legacy overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink v-for="page in pageList.items" :key="page.id" legacy :to="`/public/pages/${page.id}`">
          <template #title>{{ page.title }}</template>
          <template #prefix>
            <StatusBadge :tone="page.isLimited ? 'primary' : 'muted'" appearance="outlined">
              {{ page.isLimited ? '限定公開' : '全員に公開' }}
            </StatusBadge>
          </template>
          <template #suffix>
            <StatusBadge v-if="page.isNew" tone="danger" size="sm">NEW</StatusBadge>
          </template>
          <template #meta>{{ formatDateTimeUpdated(page.updatedAt) }}</template>
          {{ page.summary }}
        </ListItemLink>
      </div>
      <PaginationFooter
        :page="pageList.page"
        :page-size="pageList.pageSize"
        :total="pageList.total"
        @update:page="handlePageChange"
      />
    </ListPanel>
  </PageLayout>
</template>
