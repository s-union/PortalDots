<script setup lang="ts">
definePage({
  path: '/staff/pages',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'pages.read'
  }
})

import { computed, watch } from 'vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { canUseMailQueue } from '@/features/staff/access/capabilities'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildStaffPagesExportUrl,
  useDeleteStaffPageByIdMutation,
  usePatchStaffPagePinByIdMutation,
  useStaffPagesQuery,
  type StaffPageSummary
} from '@/features/staff/pages/api'
import { useSessionStore } from '@/features/session/store'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const pagesQuery = useStaffPagesQuery('', enabled)
const patchPinMutation = usePatchStaffPagePinByIdMutation()
const deletePageMutation = useDeleteStaffPageByIdMutation()
const exportHref = computed(() => buildStaffPagesExportUrl())
const mailQueueAvailable = computed(() => canUseMailQueue(sessionStore.roles, sessionStore.permissions))

const sortKeys = ['id', 'title', 'isPinned', 'isPublic', 'createdAt', 'updatedAt'] as const
type StaffPageSortKey = (typeof sortKeys)[number]
const isStaffPageSortKey = createSortKeyGuard(sortKeys)
const sort = useSortState<StaffPageSortKey>('id')

const columns: StaffDataGridColumn[] = [
  { key: 'pageNumber', label: 'お知らせID', sortable: false, cellClass: 'font-medium text-body' },
  { key: 'title', label: 'タイトル', sortable: true },
  { key: 'viewableTags', label: '閲覧可能なタグ' },
  { key: 'documents', label: '関連する配布資料' },
  { key: 'body', label: '本文' },
  { key: 'isPinned', label: '固定', sortable: true, align: 'center' },
  { key: 'isPublic', label: '公開', sortable: true, align: 'center' },
  { key: 'notes', label: 'スタッフ用メモ' },
  { key: 'createdAt', label: '作成日時', sortable: true },
  { key: 'updatedAt', label: '更新日時', sortable: true }
]

const isBusy = computed(
  () =>
    pagesQuery.isPending.value ||
    pagesQuery.isFetching.value ||
    patchPinMutation.isPending.value ||
    deletePageMutation.isPending.value
)

const sortedPages = computed(() => {
  const pages = pagesQuery.data.value ?? []
  const key = sort.sortKey.value
  const direction = sort.sortDirection.value
  const order = direction === 'asc' ? 1 : -1

  return [...pages].sort((left, right) => {
    switch (key) {
      case 'isPinned':
        return compareBoolean(left.isPinned, right.isPinned) * order
      case 'isPublic':
        return compareBoolean(left.isPublic, right.isPublic) * order
      case 'createdAt':
        return compareString(left.createdAt, right.createdAt) * order
      case 'updatedAt':
        return compareString(left.updatedAt, right.updatedAt) * order
      case 'id':
        return compareString(left.id, right.id) * order
      case 'title':
        return compareString(left.title, right.title) * order
      default:
        return 0
    }
  })
})

const pagination = usePaginationState(computed(() => sortedPages.value.length))

const rows = computed<StaffDataGridRow[]>(() => {
  const start = (pagination.page.value - 1) * pagination.pageSize.value
  const end = start + pagination.pageSize.value

  return sortedPages.value.slice(start, end).map((page, index) => ({
    id: page.id,
    pageNumber: String(start + index + 1),
    title: page.title,
    viewableTags: page.viewableTags,
    documents: page.documents,
    body: page.body,
    isPinned: page.isPinned,
    isPublic: page.isPublic,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    notes: page.notes
  }))
})

watch(
  pagination.totalPages,
  (nextTotalPages) => {
    pagination.page.value = Math.min(pagination.page.value, nextTotalPages)
  },
  { immediate: true }
)

function compareString(left: string, right: string) {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

function compareBoolean(left: boolean, right: boolean) {
  if (left === right) {
    return 0
  }
  return left ? 1 : -1
}

function handleSort(nextSortKey: string) {
  if (!isStaffPageSortKey(nextSortKey)) {
    return
  }

  sort.toggleSort(nextSortKey)
  pagination.resetPage()
}

function resolveRowId(row: StaffDataGridRow) {
  return String(row.id ?? '')
}

function resolveText(value: unknown) {
  if (typeof value !== 'string') {
    return '-'
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : '-'
}

function resolveTags(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function resolveDocuments(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(
    (item): item is StaffPageSummary['documents'][number] =>
      typeof item === 'object' && item !== null && 'id' in item && 'name' in item
  )
}

async function handleTogglePin(pageId: string, currentPinned: boolean) {
  await patchPinMutation.mutateAsync({
    pageId,
    isPinned: !currentPinned
  })
}

async function handleDeletePage(pageId: string, pageTitle: string) {
  if (typeof window !== 'undefined' && !window.confirm(`お知らせ「${pageTitle}」を削除しますか？`)) {
    return
  }
  await deletePageMutation.mutateAsync(pageId)
}
</script>

<template>
  <PageLayout class="max-w-full">
    <DataCard overflow-hidden>
      <StaffDataGrid
        :rows="rows"
        :columns="columns"
        :page="pagination.page.value"
        :page-size="pagination.pageSize.value"
        :total="sortedPages.length"
        :loading="isBusy"
        :sort-key="sort.sortKey.value"
        :sort-direction="sort.sortDirection.value"
        :show-filter-button="true"
        table-label="お知らせ一覧"
        empty-message="お知らせは見つかりませんでした。"
        @first="pagination.setFirstPage"
        @prev="pagination.setPrevPage"
        @next="pagination.setNextPage"
        @last="pagination.setLastPage"
        @reload="pagesQuery.refetch()"
        @sort="handleSort"
        @update:page-size="pagination.setPageSize"
      >
        <template #toolbar>
          <RouterLink
            to="/staff/pages/create"
            class="rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <i class="fas fa-plus fa-fw" aria-hidden="true" />
            新規お知らせ
          </RouterLink>
          <RouterLink
            v-if="mailQueueAvailable"
            to="/staff/mails"
            class="inline-flex items-center gap-2 px-2 text-[1.05rem] text-primary transition hover:text-primary-hover hover:no-underline"
          >
            <i class="far fa-envelope fa-fw" aria-hidden="true" />
            メール配信設定
          </RouterLink>
          <a
            :href="exportHref"
            class="inline-flex items-center gap-2 px-2 text-[1.05rem] text-primary transition hover:text-primary-hover hover:no-underline"
          >
            <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
            CSVで出力
          </a>
        </template>

        <template #actions="{ row }">
          <div class="flex items-center gap-1">
            <RouterLink
              :to="`/staff/pages/${encodeURIComponent(resolveRowId(row))}`"
              class="inline-flex h-8 w-8 items-center justify-center rounded text-body transition hover:bg-primary-light hover:text-primary"
              title="編集"
            >
              <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
            </RouterLink>
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded text-body transition hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              :title="row.isPinned ? '固定表示を解除する' : '固定表示する'"
              :disabled="patchPinMutation.isPending.value"
              @click="handleTogglePin(resolveRowId(row), row.isPinned === true)"
            >
              <i class="fas fa-thumbtack fa-fw" aria-hidden="true" />
            </button>
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              title="削除"
              :disabled="deletePageMutation.isPending.value"
              @click="handleDeletePage(resolveRowId(row), typeof row.title === 'string' ? row.title : '')"
            >
              <i class="fas fa-trash fa-fw" aria-hidden="true" />
            </button>
          </div>
        </template>

        <template #cell-title="{ row }">
          <RouterLink class="font-medium text-primary" :to="`/staff/pages/${encodeURIComponent(resolveRowId(row))}`">
            {{ row.title }}
          </RouterLink>
        </template>

        <template #cell-viewableTags="{ value }">
          <div class="flex flex-wrap gap-1">
            <template v-for="tag in resolveTags(value)" :key="tag">
              <span class="inline-flex items-center rounded bg-primary px-2 py-1 text-xs font-semibold text-white">
                {{ tag }}
              </span>
            </template>
            <span v-if="resolveTags(value).length === 0" class="text-muted">全体に公開</span>
          </div>
        </template>

        <template #cell-documents="{ value }">
          <div class="flex flex-wrap gap-1">
            <template v-for="document in resolveDocuments(value)" :key="document.id">
              <span class="inline-flex items-center rounded bg-primary px-2 py-1 text-xs font-semibold text-white">
                {{ document.name }}
              </span>
            </template>
            <span v-if="resolveDocuments(value).length === 0" class="text-muted">-</span>
          </div>
        </template>

        <template #cell-body="{ value }">
          <span class="block min-w-[18rem] max-w-[24rem] truncate">{{ resolveText(value) }}</span>
        </template>

        <template #cell-isPinned="{ value }">
          <strong v-if="value === true">はい</strong>
          <span v-else>-</span>
        </template>

        <template #cell-isPublic="{ value }">
          <strong v-if="value === true">はい</strong>
          <span v-else>-</span>
        </template>

        <template #cell-createdAt="{ value }">
          <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
        </template>

        <template #cell-updatedAt="{ value }">
          <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
        </template>

        <template #cell-notes="{ value }">
          <span class="whitespace-pre-wrap">{{ resolveText(value) }}</span>
        </template>
      </StaffDataGrid>
    </DataCard>
  </PageLayout>
</template>
