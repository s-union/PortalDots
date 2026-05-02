<script setup lang="ts">
definePage({
  path: '/staff/pages',
  meta: staffPageMeta('pages.read')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { computed, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import CsvExportLink from '@/components/ui/CsvExportLink.vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
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
import { compareBoolean, compareString } from '@/lib/compareString'
import { resolveRowId, resolveTags, resolveText } from '@/lib/dataGridHelpers'
import FaIcon from '@/components/ui/FaIcon.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import YesNo from '@/components/ui/YesNo.vue'

const router = useRouter()
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

function handleSort(nextSortKey: string) {
  if (!isStaffPageSortKey(nextSortKey)) {
    return
  }

  sort.toggleSort(nextSortKey)
  pagination.resetPage()
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

function navigateToEdit(pageId: string) {
  router.push(`/staff/pages/${encodeURIComponent(pageId)}`)
}
</script>

<template>
  <PageLayout fullWidth>
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
          <BaseButton to="/staff/pages/create" variant="primary" size="md" weight="semibold">
            <FaIcon name="plus" fixed-width />
            新規お知らせ
          </BaseButton>
          <RouterLink
            v-if="mailQueueAvailable"
            to="/staff/mails"
            class="inline-flex items-center gap-2 px-2 text-[1.05rem] text-primary transition hover:text-primary-hover hover:no-underline"
          >
            <FaIcon prefix="far" name="envelope" fixed-width />
            メール配信設定
          </RouterLink>
          <CsvExportLink :href="exportHref">CSVで出力</CsvExportLink>
        </template>

        <template #actions="{ row }">
          <div class="flex items-center gap-1">
            <IconActionButton title="編集" @click="navigateToEdit(resolveRowId(row))">
              <FaIcon name="pencil-alt" fixed-width />
            </IconActionButton>
            <IconActionButton
              :title="row.isPinned ? '固定表示を解除する' : '固定表示する'"
              :disabled="patchPinMutation.isPending.value"
              @click="handleTogglePin(resolveRowId(row), row.isPinned === true)"
            >
              <FaIcon name="thumbtack" fixed-width />
            </IconActionButton>
            <IconActionButton
              variant="danger"
              title="削除"
              :disabled="deletePageMutation.isPending.value"
              @click="handleDeletePage(resolveRowId(row), typeof row.title === 'string' ? row.title : '')"
            >
              <FaIcon name="trash" fixed-width />
            </IconActionButton>
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
              <StatusBadge tone="accent">
                {{ tag }}
              </StatusBadge>
            </template>
            <span v-if="resolveTags(value).length === 0" class="text-muted">全体に公開</span>
          </div>
        </template>

        <template #cell-documents="{ value }">
          <div class="flex flex-wrap gap-1">
            <template v-for="document in resolveDocuments(value)" :key="document.id">
              <StatusBadge tone="accent">
                {{ document.name }}
              </StatusBadge>
            </template>
            <span v-if="resolveDocuments(value).length === 0" class="text-muted">-</span>
          </div>
        </template>

        <template #cell-body="{ value }">
          <span class="block min-w-[18rem] max-w-[24rem] truncate">{{ resolveText(value) }}</span>
        </template>

        <template #cell-isPinned="{ value }">
          <YesNo :value="value === true" />
        </template>

        <template #cell-isPublic="{ value }">
          <YesNo :value="value === true" />
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
