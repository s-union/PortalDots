<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'documents.read'
  }
})

import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import DataCard from '@/components/layouts/DataCard.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import { formatFileSize } from '@/lib/format/fileSize'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildStaffDocumentsExportUrl,
  buildStaffDocumentDownloadUrl,
  useStaffDocumentsQuery,
  type StaffDocumentSummary
} from '@/features/staff/documents/api'
import { useSessionStore } from '@/features/session/store'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const documentsQuery = useStaffDocumentsQuery(enabled)
const exportHref = computed(() => buildStaffDocumentsExportUrl())

const sortKeys = ['id', 'name', 'isImportant', 'isPublic', 'filename', 'sizeBytes', 'updatedAt'] as const
type StaffDocumentSortKey = (typeof sortKeys)[number]
const isStaffDocumentSortKey = createSortKeyGuard(sortKeys)
const sort = useSortState<StaffDocumentSortKey>('id')

const columns: StaffDataGridColumn[] = [
  { key: 'circle', label: '企画' },
  { key: 'name', label: '配布資料名', sortable: true },
  { key: 'description', label: '説明' },
  { key: 'notes', label: 'スタッフ用メモ' },
  { key: 'isImportant', label: '重要', sortable: true, align: 'center' },
  { key: 'isPublic', label: '公開', sortable: true, align: 'center' },
  { key: 'filename', label: 'ファイル名', sortable: true },
  { key: 'sizeBytes', label: 'サイズ', sortable: true, align: 'right' },
  { key: 'updatedAt', label: '更新日時', sortable: true }
]

const isBusy = computed(() => documentsQuery.isPending.value || documentsQuery.isFetching.value)

const sortedDocuments = computed(() => {
  const documents = documentsQuery.data.value ?? []
  const key = sort.sortKey.value
  const direction = sort.sortDirection.value
  const order = direction === 'asc' ? 1 : -1

  return [...documents].sort((left, right) => {
    switch (key) {
      case 'isImportant':
        return compareBoolean(left.isImportant, right.isImportant) * order
      case 'isPublic':
        return compareBoolean(left.isPublic, right.isPublic) * order
      case 'sizeBytes':
        return (left.sizeBytes - right.sizeBytes) * order
      default:
        return compareString(resolveSortValue(left, key), resolveSortValue(right, key)) * order
    }
  })
})

const pagination = usePaginationState(computed(() => sortedDocuments.value.length))

const rows = computed<StaffDataGridRow[]>(() => {
  const start = (pagination.page.value - 1) * pagination.pageSize.value
  const end = start + pagination.pageSize.value

  return sortedDocuments.value.slice(start, end).map((document) => ({
    id: document.id,
    circle: document.circle,
    name: document.name,
    description: document.description,
    notes: document.notes,
    isImportant: document.isImportant,
    isPublic: document.isPublic,
    filename: document.filename,
    sizeBytes: document.sizeBytes,
    updatedAt: document.updatedAt
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

function resolveSortValue(document: StaffDocumentSummary, sortKey: StaffDocumentSortKey) {
  switch (sortKey) {
    case 'id':
      return document.id
    case 'name':
      return document.name
    case 'filename':
      return document.filename
    case 'updatedAt':
      return document.updatedAt
    default:
      return ''
  }
}

function handleSort(nextSortKey: string) {
  if (!isStaffDocumentSortKey(nextSortKey)) {
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
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : '-'
}
</script>

<template>
  <PageLayout class="max-w-full">
    <PageHeader title="配布資料管理" description="全企画の配布資料を横断して管理します。" />

    <DataCard title="配布資料一覧" description="全企画の配布資料を一覧管理します。" overflow-hidden>
      <StaffDataGrid
        :rows="rows"
        :columns="columns"
        :page="pagination.page.value"
        :page-size="pagination.pageSize.value"
        :total="sortedDocuments.length"
        :loading="isBusy"
        :sort-key="sort.sortKey.value"
        :sort-direction="sort.sortDirection.value"
        table-label="配布資料一覧"
        empty-message="staff documents はまだありません。"
        @first="pagination.setFirstPage"
        @prev="pagination.setPrevPage"
        @next="pagination.setNextPage"
        @last="pagination.setLastPage"
        @reload="documentsQuery.refetch()"
        @sort="handleSort"
        @update:page-size="pagination.setPageSize"
      >
        <template #toolbar>
          <RouterLink
            to="/staff/documents/create"
            class="rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <i class="fas fa-plus fa-fw" aria-hidden="true" />
            新規配布資料
          </RouterLink>
          <a
            :href="exportHref"
            class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          >
            <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
            CSVで出力
          </a>
        </template>

        <template #actions="{ row }">
          <div class="flex items-center gap-1">
            <RouterLink
              :to="`/staff/documents/${encodeURIComponent(resolveRowId(row))}/edit`"
              class="inline-flex h-8 w-8 items-center justify-center rounded text-body transition hover:bg-primary-light hover:text-primary"
              title="編集"
            >
              <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
            </RouterLink>
            <a
              :href="buildStaffDocumentDownloadUrl(resolveRowId(row))"
              class="inline-flex h-8 w-8 items-center justify-center rounded text-body transition hover:bg-primary-light hover:text-primary"
              target="_blank"
              rel="noreferrer"
              title="表示"
            >
              <i class="far fa-file-alt fa-fw" aria-hidden="true" />
            </a>
          </div>
        </template>

        <template #cell-circle="{ value }">
          <span v-if="value && typeof value === 'object' && 'name' in value">
            {{ (value as { name: string }).name }}
          </span>
          <span v-else class="text-muted">-</span>
        </template>

        <template #cell-name="{ row }">
          <RouterLink
            class="font-medium text-primary"
            :to="`/staff/documents/${encodeURIComponent(resolveRowId(row))}/edit`"
          >
            {{ row.name }}
          </RouterLink>
        </template>

        <template #cell-description="{ value }">
          <span class="whitespace-pre-wrap">{{ resolveText(value) }}</span>
        </template>

        <template #cell-notes="{ value }">
          <span class="whitespace-pre-wrap">{{ resolveText(value) }}</span>
        </template>

        <template #cell-isImportant="{ value }">
          <strong v-if="value === true">はい</strong>
          <span v-else>-</span>
        </template>

        <template #cell-isPublic="{ value }">
          <strong v-if="value === true">はい</strong>
          <span v-else>-</span>
        </template>

        <template #cell-sizeBytes="{ value }">
          <span>{{ typeof value === 'number' ? formatFileSize(value) : '-' }}</span>
        </template>
      </StaffDataGrid>
    </DataCard>
  </PageLayout>
</template>
