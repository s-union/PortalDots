<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/documents',
  meta: staffPageMeta('documents.read')
})

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
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
import { resolveRowId, resolveText } from '@/lib/dataGridHelpers'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { canDeleteDocuments } from '@/features/staff/access/capabilities'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildDeleteStaffDocumentConfirmMessage,
  buildStaffDocumentsExportUrl,
  buildStaffDocumentDownloadUrl,
  deleteStaffDocument,
  useStaffDocumentsQuery
} from '@/features/staff/documents/api'
import { useSessionStore } from '@/features/session/store'
import { useStaffDataGridFilters } from '@/lib/useStaffDataGridFilters'
import { compareString } from '@/lib/compareString'
import FaIcon from '@/components/ui/FaIcon.vue'
import YesNo from '@/components/ui/YesNo.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const publicConfigQuery = usePublicConfigQuery()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const documentsQuery = useStaffDocumentsQuery(enabled)
const exportHref = computed(() => buildStaffDocumentsExportUrl())
const isDemoMode = computed(() => publicConfigQuery.data.value?.isDemo === true)
const deletingDocumentId = ref('')
const canDelete = computed(() => canDeleteDocuments(sessionStore.roles, sessionStore.permissions))
const deleteDocumentMutation = useMutation({
  mutationFn: async () => deleteStaffDocument(deletingDocumentId.value, sessionStore.csrfToken),
  onSuccess: async () => {
    await documentsQuery.refetch()
  }
})

const sortKeys = [
  'documentNumber',
  'name',
  'sizeBytes',
  'extension',
  'description',
  'isPublic',
  'isImportant',
  'createdAt',
  'updatedAt',
  'notes'
] as const
type StaffDocumentSortKey = (typeof sortKeys)[number]

const filterFields: StaffFilterField[] = [
  { key: 'id', label: '配布資料ID', type: 'string' },
  { key: 'name', label: '配布資料名', type: 'string' },
  { key: 'extension', label: 'ファイル形式', type: 'string' },
  { key: 'description', label: '説明', type: 'string' },
  { key: 'isPublic', label: '公開', type: 'bool' },
  { key: 'isImportant', label: '重要', type: 'bool' },
  { key: 'createdAt', label: '作成日時', type: 'string' },
  { key: 'updatedAt', label: '更新日時', type: 'string' },
  { key: 'notes', label: 'スタッフ用メモ', type: 'string' }
]

function isFilterKey(key: string) {
  return filterFields.some((f) => f.key === key)
}

const orderedDocuments = computed(() =>
  [...(documentsQuery.data.value ?? [])]
    .filter((document) => !isDemoMode.value || document.isPublic)
    .sort((left, right) => compareString(left.createdAt, right.createdAt))
)

const documentOrderMap = computed(() => {
  const order = new Map<string, number>()
  orderedDocuments.value.forEach((document, index) => {
    order.set(document.id, index + 1)
  })
  return order
})

const rawRows = computed<Record<string, unknown>[]>(() =>
  orderedDocuments.value.map((document) => ({
    id: document.id,
    documentNumber: String(documentOrderMap.value.get(document.id) ?? 0),
    name: document.name,
    fileLinkLabel: '表示',
    description: document.description,
    sizeBytes: document.sizeBytes,
    extension: document.extension,
    isPublic: document.isPublic,
    isImportant: document.isImportant,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    notes: document.notes
  }))
)

function resolveSortValue(row: Record<string, unknown>, key: StaffDocumentSortKey) {
  if (key === 'documentNumber') {
    return String(row.documentNumber ?? '0').padStart(10, '0')
  }
  if (key === 'isPublic') {
    return row.isPublic ? '1' : '0'
  }
  if (key === 'isImportant') {
    return row.isImportant ? '1' : '0'
  }
  if (key === 'sizeBytes') {
    return String(row.sizeBytes ?? 0).padStart(20, '0')
  }
  return String(row[key] ?? '').toLowerCase()
}

function matchesSearch(row: Record<string, unknown>, search: string) {
  const haystack = [row.id, row.name, row.description, row.extension, row.notes, row.documentNumber]
    .join(' ')
    .toLowerCase()
  return haystack.includes(search)
}

function matchesFilterQuery(row: Record<string, unknown>, query: { keyName: string; operator: string; value: string }) {
  if (query.keyName === 'isPublic' || query.keyName === 'isImportant') {
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
  searchQuery,
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
} = useStaffDataGridFilters<Record<string, unknown>, StaffDocumentSortKey>({
  rows: rawRows,
  sortKeys,
  defaultSortKey: 'documentNumber',
  filterFields,
  resolveSortValue,
  matchesSearch,
  matchesFilterQuery,
  isFilterKey
})

const columns: StaffDataGridColumn[] = [
  { key: 'documentNumber', label: '配布資料ID', sortable: true, align: 'right', cellClass: 'font-medium text-body' },
  { key: 'name', label: '配布資料名', sortable: true },
  { key: 'fileLinkLabel', label: 'ファイル' },
  { key: 'sizeBytes', label: 'サイズ(バイト)', sortable: true, align: 'right' },
  { key: 'extension', label: 'ファイル形式', sortable: true, align: 'center' },
  { key: 'description', label: '説明' },
  { key: 'isPublic', label: '公開', sortable: true, align: 'center' },
  { key: 'isImportant', label: '重要', sortable: true, align: 'center' },
  { key: 'createdAt', label: '作成日時', sortable: true },
  { key: 'updatedAt', label: '更新日時', sortable: true },
  { key: 'notes', label: 'スタッフ用メモ', sortable: true }
]

const isBusy = computed(
  () => documentsQuery.isPending.value || documentsQuery.isFetching.value || deleteDocumentMutation.isPending.value
)

async function handleDeleteDocument(row: StaffDataGridRow) {
  const documentId = resolveRowId(row)
  const documentName = typeof row.name === 'string' ? row.name : 'この配布資料'

  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffDocumentConfirmMessage(documentName))) {
    return
  }

  deletingDocumentId.value = documentId
  await deleteDocumentMutation.mutateAsync()
}

function navigateToEdit(row: StaffDataGridRow) {
  router.push(`/staff/documents/${encodeURIComponent(resolveRowId(row))}/edit`)
}

async function handleReload() {
  await documentsQuery.refetch()
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
          table-label="配布資料一覧"
          empty-message="staff documents はまだありません。"
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
                  placeholder="資料ID・資料名・説明・ファイル形式で絞り込み"
                  class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button :class="buttonVariants({ variant: 'secondary', size: 'md' })" type="submit">
                  <FaIcon name="search" fixed-width />
                  絞り込み
                </button>
              </form>
              <p class="text-sm text-muted">
                現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全資料:
                {{ rawRows.length }}
              </p>
            </ToolbarRow>
            <ToolbarRow>
              <BaseButton to="/staff/documents/create" variant="primary" size="md" weight="semibold">
                <FaIcon name="plus" fixed-width />
                新規配布資料
              </BaseButton>
              <CsvExportLink :href="exportHref">CSVで出力</CsvExportLink>
            </ToolbarRow>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center gap-1">
              <IconActionButton title="編集" @click="navigateToEdit(row)">
                <FaIcon name="pencil-alt" fixed-width />
              </IconActionButton>
              <IconActionButton
                v-if="canDelete"
                variant="danger"
                title="削除"
                :disabled="deleteDocumentMutation.isPending.value"
                @click="handleDeleteDocument(row)"
              >
                <FaIcon name="trash" fixed-width />
              </IconActionButton>
            </div>
          </template>

          <template #cell-name="{ value }">
            <span class="font-medium text-body">
              {{ typeof value === 'string' && value.trim().length > 0 ? value : '-' }}
            </span>
          </template>

          <template #cell-fileLinkLabel="{ row }">
            <a
              :href="buildStaffDocumentDownloadUrl(resolveRowId(row))"
              class="font-medium text-primary"
              target="_blank"
              rel="noreferrer"
            >
              表示
            </a>
          </template>

          <template #cell-description="{ value }">
            <span class="whitespace-pre-wrap">{{ resolveText(value) }}</span>
          </template>

          <template #cell-sizeBytes="{ value }">
            <span>{{ typeof value === 'number' ? value : '-' }}</span>
          </template>

          <template #cell-isPublic="{ value }">
            <YesNo :value="value === true" />
          </template>

          <template #cell-isImportant="{ value }">
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
