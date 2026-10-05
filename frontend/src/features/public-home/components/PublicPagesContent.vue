<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { formatDateTime } from '@/lib/format/datetime'
import { usePublicPagesQuery } from '@/features/public-home/api'
import { calculateTotalPages } from '@/lib/pagination'
import { routePositiveInteger } from '@/lib/routeQuery'

const route = useRoute()
const router = useRouter()
const pageSize = 10
const page = computed(() => routePositiveInteger(route.query.page))
const pagesQuery = usePublicPagesQuery(
  computed(() => true),
  page,
  computed(() => pageSize),
  computed(() => '')
)
const pageList = computed(() => pagesQuery.data.value ?? { items: [], page: 1, pageSize, total: 0 })
const totalPages = computed(() => calculateTotalPages(pageList.value.total, pageList.value.pageSize))
const shouldShowPagination = computed(() => totalPages.value > 1)

watch(
  () => pagesQuery.data.value?.page,
  async (resolvedPage) => {
    if (!resolvedPage || resolvedPage === page.value) {
      return
    }

    await router.replace({
      query: resolvedPage <= 1 ? {} : { page: String(resolvedPage) }
    })
  }
)

async function handlePageChange(nextPage: number) {
  await router.replace({
    query: nextPage <= 1 ? {} : { page: String(nextPage) }
  })
}
</script>

<template>
  <div
    v-if="pagesQuery.isPending.value"
    class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
  >
    読み込み中...
  </div>

  <div
    v-else-if="pageList.items.length === 0"
    class="rounded border border-border bg-surface p-10 text-center text-muted shadow-lv1"
  >
    お知らせはまだありません
  </div>

  <ListPanel v-else legacy overflow-hidden>
    <div class="divide-y divide-border">
      <ListItemLink
        v-for="page in pageList.items"
        :key="page.id"
        legacy
        :to="`/public/pages/${encodeURIComponent(page.id)}`"
      >
        <template #title>{{ page.title }}</template>
        <template #prefix>
          <StatusBadge :tone="page.isLimited ? 'primary' : 'muted'" appearance="outlined">
            {{ page.isLimited ? '限定公開' : '全員に公開' }}
          </StatusBadge>
        </template>
        <template v-if="page.isNew" #suffix>
          <StatusBadge tone="danger" size="sm">NEW</StatusBadge>
        </template>
        <template #meta>{{ formatDateTime(page.updatedAt) }}</template>
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
</template>
