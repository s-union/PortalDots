<script setup lang="ts">
definePage({
  path: '/staff/documents',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'documents.read'
  }
})

import { computed, ref, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { RouterLink } from 'vue-router'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { canDeleteDocuments } from '@/features/staff/access/capabilities'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildDeleteStaffDocumentConfirmMessage,
  buildStaffDocumentsExportUrl,
  buildStaffDocumentDownloadUrl,
  deleteStaffDocument,
  useStaffDocumentsQuery,
  type StaffDocumentSummary
} from '@/features/staff/documents/api'
import { useSessionStore } from '@/features/session/store'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'

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
const isStaffDocumentSortKey = createSortKeyGuard(sortKeys)
const sort = useSortState<StaffDocumentSortKey>('documentNumber')

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

const sortedDocuments = computed(() => {
  const documents = orderedDocuments.value
  const key = sort.sortKey.value
  const direction = sort.sortDirection.value
  const order = direction === 'asc' ? 1 : -1

  return [...documents].sort((left, right) => {
    switch (key) {
      case 'documentNumber':
        return ((documentOrderMap.value.get(left.id) ?? 0) - (documentOrderMap.value.get(right.id) ?? 0)) * order
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
    documentNumber: String(documentOrderMap.value.get(document.id) ?? start + 1),
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
    case 'documentNumber':
      return String(documentOrderMap.value.get(document.id) ?? 0)
    case 'name':
      return document.name
    case 'extension':
      return document.extension
    case 'description':
      return document.description
    case 'createdAt':
      return document.createdAt
    case 'updatedAt':
      return document.updatedAt
    case 'notes':
      return document.notes
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

async function handleDeleteDocument(row: StaffDataGridRow) {
  const documentId = resolveRowId(row)
  const documentName = typeof row.name === 'string' ? row.name : 'この配布資料'

  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffDocumentConfirmMessage(documentName))) {
    return
  }

  deletingDocumentId.value = documentId
  await deleteDocumentMutation.mutateAsync()
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
    <DataCard overflow-hidden>
      <StaffDataGrid
        :rows="rows"
        :columns="columns"
        :page="pagination.page.value"
        :page-size="pagination.pageSize.value"
        :total="sortedDocuments.length"
        :loading="isBusy"
        :sort-key="sort.sortKey.value"
        :sort-direction="sort.sortDirection.value"
        :show-filter-button="true"
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
            class="inline-flex items-center gap-2 px-2 text-[1.05rem] text-primary transition hover:text-primary-hover hover:no-underline"
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
            <button
              v-if="canDelete"
              class="inline-flex h-8 w-8 items-center justify-center rounded text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              title="削除"
              :disabled="deleteDocumentMutation.isPending.value"
              @click="handleDeleteDocument(row)"
            >
              <i class="fas fa-trash fa-fw" aria-hidden="true" />
            </button>
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
          <strong v-if="value === true">はい</strong>
          <span v-else>-</span>
        </template>

        <template #cell-isImportant="{ value }">
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
