<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/pages',
  meta: staffPageMeta('pages.read')
})

import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import CsvExportLink from '@/components/ui/CsvExportLink.vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer, { type StaffFilterField } from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import ToolbarRow from '@/components/ui/ToolbarRow.vue'
import { buttonVariants } from '@/lib/ui/variants'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { canUseMailQueue } from '@/features/staff/access/capabilities'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildStaffPagesExportUrl,
  useDeleteStaffPageByIdMutation,
  usePatchStaffPagePinByIdMutation,
  useStaffPagesQuery
} from '@/features/staff/pages/api'
import { useSessionStore } from '@/features/session/store'
import { useStaffDataGridFilters } from '@/lib/useStaffDataGridFilters'
import type { StaffFilterMode, StaffFilterQuery } from '@/lib/staffFilterSchema'
import { resolveRowId, resolveTags } from '@/lib/dataGridHelpers'
import FaIcon from '@/components/ui/FaIcon.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import YesNo from '@/components/ui/YesNo.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const searchQuery = ref('')
const appliedFilterMode = ref<StaffFilterMode>('and')
const appliedFilterQueries = ref<StaffFilterQuery[]>([])
const staffListParams = computed(() => ({
  query: searchQuery.value,
  queries: appliedFilterQueries.value,
  mode: appliedFilterMode.value
}))
const pagesQuery = useStaffPagesQuery(staffListParams, enabled)
const patchPinMutation = usePatchStaffPagePinByIdMutation()
const deletePageMutation = useDeleteStaffPageByIdMutation()
const exportHref = computed(() => buildStaffPagesExportUrl())
const mailQueueAvailable = computed(() => canUseMailQueue(sessionStore.roles, sessionStore.permissions))

const sortKeys = ['id', 'title', 'isPinned', 'isPublic', 'createdAt', 'updatedAt'] as const
type StaffPageSortKey = (typeof sortKeys)[number]

const filterFields: StaffFilterField[] = [
  { key: 'id', label: 'お知らせID', type: 'string' },
  { key: 'title', label: 'タイトル', type: 'string' },
  { key: 'isPinned', label: '固定', type: 'bool' },
  { key: 'isPublic', label: '公開', type: 'bool' },
  { key: 'body', label: '本文', type: 'string' },
  { key: 'notes', label: 'スタッフ用メモ', type: 'string' },
  { key: 'createdAt', label: '作成日時', type: 'string' },
  { key: 'updatedAt', label: '更新日時', type: 'string' }
]

function isFilterKey(key: string) {
  return filterFields.some((f) => f.key === key)
}

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

const rawRows = computed<Record<string, unknown>[]>(() =>
  (pagesQuery.data.value ?? []).map((page, index) => ({
    id: page.id,
    pageNumber: String(index + 1),
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
)

function resolveSortValue(row: Record<string, unknown>, key: StaffPageSortKey) {
  if (key === 'isPinned') {
    return row.isPinned ? '1' : '0'
  }
  if (key === 'isPublic') {
    return row.isPublic ? '1' : '0'
  }
  return String(row[key] ?? '').toLowerCase()
}

function matchesSearch(row: Record<string, unknown>, search: string) {
  const haystack = [row.id, row.title, row.body, row.notes, row.pageNumber].join(' ').toLowerCase()
  return haystack.includes(search)
}

function matchesFilterQuery(row: Record<string, unknown>, query: { keyName: string; operator: string; value: string }) {
  if (query.keyName === 'isPinned' || query.keyName === 'isPublic') {
    const expected = query.value.trim() === 'true' || query.value.trim() === '1'
    if (query.operator === '=') {
      return row[query.keyName] === expected
    }
    if (query.operator === '!=') {
      return row[query.keyName] !== expected
    }
    return true
  }

  const left = String(row[query.keyName] ?? '').toLowerCase()
  const right = query.value.trim().toLowerCase()

  if (query.operator === '=') {
    return left === right
  }
  if (query.operator === '!=') {
    return left !== right
  }
  if (query.operator === 'not like') {
    return right === '' ? true : !left.includes(right)
  }
  return right === '' ? true : left.includes(right)
}

const {
  pagedRows,
  sortedRows,
  filterActive,
  sort,
  pagination,
  isFilterOpen,
  draftFilterMode,
  draftFilterQueries,
  handleSort,
  handleSearch,
  openFilter,
  closeFilter,
  handleAddFilter,
  handleRemoveFilter,
  handleUpdateFilter,
  handleFilterModeUpdate,
  handleApplyFilters,
  handleClearFilters
} = useStaffDataGridFilters<Record<string, unknown>, StaffPageSortKey>({
  rows: rawRows,
  sortKeys,
  defaultSortKey: 'id',
  filterFields,
  searchQuery,
  appliedFilterMode,
  appliedFilterQueries,
  serverSideFiltering: true,
  resolveSortValue,
  matchesSearch,
  matchesFilterQuery,
  isFilterKey
})

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

async function handleReload() {
  await pagesQuery.refetch()
}
</script>

<template>
  <StaffSideWindowContainer :is-open="isFilterOpen">
    <PageLayout fullWidth>
      <DataCard overflow-hidden>
        <StaffDataGrid
          :rows="pagedRows as StaffDataGridRow[]"
          :columns="columns"
          :page="pagination.page.value"
          :page-size="pagination.pageSize.value"
          :total="sortedRows.length"
          :loading="isBusy"
          :sort-key="sort.sortKey.value"
          :sort-direction="sort.sortDirection.value"
          :show-filter-button="true"
          :filter-active="filterActive"
          table-label="お知らせ一覧"
          empty-message="お知らせは見つかりませんでした。"
          @first="pagination.setFirstPage"
          @prev="pagination.setPrevPage"
          @next="pagination.setNextPage"
          @last="pagination.setLastPage"
          @reload="handleReload"
          @sort="handleSort"
          @filter="openFilter"
          @update:page-size="pagination.setPageSize"
        >
          <template #toolbar>
            <ToolbarRow>
              <form class="flex items-center gap-2" @submit.prevent="handleSearch">
                <input
                  v-model="searchQuery"
                  type="search"
                  placeholder="タイトル・本文・メモで絞り込み"
                  class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button :class="buttonVariants({ variant: 'secondary', size: 'md' })" type="submit">
                  <FaIcon name="search" fixed-width />
                  絞り込み
                </button>
              </form>
              <p class="text-sm text-muted">
                現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全お知らせ:
                {{ rawRows.length }}
              </p>
            </ToolbarRow>
            <ToolbarRow>
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
            </ToolbarRow>
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
                <StatusBadge tone="accent">{{ tag }}</StatusBadge>
              </template>
              <span v-if="resolveTags(value).length === 0" class="text-muted">全体に公開</span>
            </div>
          </template>

          <template #cell-documents="{ value }">
            <div class="flex flex-wrap gap-1">
              <template v-for="document in Array.isArray(value) ? value : []" :key="document.id">
                <StatusBadge tone="accent">{{ document.name }}</StatusBadge>
              </template>
              <span v-if="!Array.isArray(value) || value.length === 0" class="text-muted">-</span>
            </div>
          </template>

          <template #cell-body="{ row }">
            <span class="block min-w-[18rem] max-w-[24rem] truncate">{{
              typeof row.body === 'string' ? row.body : '-'
            }}</span>
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
            <span class="whitespace-pre-wrap">{{ typeof value === 'string' ? value : '-' }}</span>
          </template>
        </StaffDataGrid>
      </DataCard>
    </PageLayout>
  </StaffSideWindowContainer>

  <StaffSideWindow :is-open="isFilterOpen" title="絞り込み" @click-close="closeFilter">
    <StaffFilterDrawer
      :fields="filterFields"
      :queries="draftFilterQueries"
      :mode="draftFilterMode"
      :loading="isBusy"
      @add="handleAddFilter"
      @remove="handleRemoveFilter"
      @update-query="handleUpdateFilter"
      @update-mode="handleFilterModeUpdate"
      @apply="handleApplyFilters"
      @clear="handleClearFilters"
    />
  </StaffSideWindow>
</template>
