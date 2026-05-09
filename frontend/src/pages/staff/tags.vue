<script setup lang="ts">
definePage({
  path: '/staff/tags',
  meta: staffPageMeta('tags.read')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { computed, ref } from 'vue'
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
import StaffTagEditor from '@/components/staff/StaffTagEditor.vue'
import ToolbarRow from '@/components/ui/ToolbarRow.vue'
import { buttonVariants } from '@/lib/ui/variants'
import { resolveRowId } from '@/lib/dataGridHelpers'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { buildApiUrl } from '@/lib/api/client'
import { useStaffDataGridFilters } from '@/lib/useStaffDataGridFilters'
import { useOrderedItems } from '@/lib/useStaffDataTable'
import { canDeleteTags } from '@/features/staff/access/capabilities'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { buildDeleteStaffTagConfirmMessage, deleteStaffTag, useStaffTagsQuery } from '@/features/staff/masters/tags'
import { useSessionStore } from '@/features/session/store'
import FaIcon from '@/components/ui/FaIcon.vue'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const tagsQuery = useStaffTagsQuery(enabled)
const exportHref = computed(() => buildApiUrl('/staff/tags/export'))
const canDelete = computed(() => canDeleteTags(sessionStore.roles, sessionStore.permissions))
const isEditorOpen = ref(false)
const selectedTagId = ref('')
const deletingTagId = ref('')

const deleteTagMutation = useMutation({
  mutationFn: async () => deleteStaffTag(deletingTagId.value, sessionStore.csrfToken),
  onSuccess: async () => {
    await tagsQuery.refetch()
  }
})

const sortKeys = ['tagNumber', 'name', 'createdAt', 'updatedAt'] as const
type StaffTagSortKey = (typeof sortKeys)[number]

const filterFields: StaffFilterField[] = [
  { key: 'id', label: 'タグID', type: 'string' },
  { key: 'name', label: 'タグ名', type: 'string' },
  { key: 'createdAt', label: '作成日時', type: 'string' },
  { key: 'updatedAt', label: '更新日時', type: 'string' }
]

function isFilterKey(key: string) {
  return filterFields.some((f) => f.key === key)
}

const columns: StaffDataGridColumn[] = [
  { key: 'tagNumber', label: 'タグID', sortable: true, align: 'right', cellClass: 'font-medium text-body' },
  { key: 'name', label: 'タグ', sortable: true },
  { key: 'createdAt', label: '作成日時', sortable: true },
  { key: 'updatedAt', label: '更新日時', sortable: true }
]

const { orderedItems: orderedTags, orderMap: tagOrderMap } = useOrderedItems(computed(() => tagsQuery.data.value ?? []))

const rawRows = computed<Record<string, unknown>[]>(() =>
  orderedTags.value.map((tag) => ({
    id: tag.id,
    tagNumber: String(tagOrderMap.value.get(tag.id) ?? 0),
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt
  }))
)

function resolveSortValue(row: Record<string, unknown>, key: StaffTagSortKey) {
  if (key === 'tagNumber') return String(row.tagNumber ?? '0').padStart(10, '0')
  return String(row[key] ?? '').toLowerCase()
}

function matchesSearch(row: Record<string, unknown>, search: string) {
  const haystack = [row.id, row.name, row.tagNumber].join(' ').toLowerCase()
  return haystack.includes(search)
}

function matchesFilterQuery(row: Record<string, unknown>, query: { keyName: string; operator: string; value: string }) {
  const left = String(row[query.keyName] ?? '').toLowerCase()
  const right = query.value.trim().toLowerCase()

  if (query.operator === '=') return left === right
  if (query.operator === '!=') return left !== right
  if (query.operator === 'not like') return right === '' ? true : !left.includes(right)
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
} = useStaffDataGridFilters<Record<string, unknown>, StaffTagSortKey>({
  rows: rawRows,
  sortKeys,
  defaultSortKey: 'tagNumber',
  filterFields,
  resolveSortValue,
  matchesSearch,
  matchesFilterQuery,
  isFilterKey
})

const selectedTag = computed(() => orderedTags.value.find((tag) => tag.id === selectedTagId.value) ?? null)

const isBusy = computed(
  () => tagsQuery.isPending.value || tagsQuery.isFetching.value || deleteTagMutation.isPending.value
)

function openCreateEditor() {
  selectedTagId.value = ''
  isEditorOpen.value = true
}

function openEditEditor(tagId: string) {
  selectedTagId.value = tagId
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
}

function handleSaved() {
  closeEditor()
}

function handleDeleted() {
  selectedTagId.value = ''
  closeEditor()
}

async function handleDeleteTag(row: StaffDataGridRow) {
  const tagId = resolveRowId(row)
  const tag = orderedTags.value.find((value) => value.id === tagId)
  if (!tag) {
    return
  }

  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffTagConfirmMessage(tag.name))) {
    return
  }

  deletingTagId.value = tag.id
  try {
    await deleteTagMutation.mutateAsync()
    if (selectedTagId.value === tag.id) {
      selectedTagId.value = ''
      closeEditor()
    }
  } finally {
    deletingTagId.value = ''
  }
}

async function handleReload() {
  await tagsQuery.refetch()
}
</script>

<template>
  <PageLayout fullWidth>
    <StaffSideWindowContainer :is-open="isEditorOpen || isFilterOpen">
      <DataCard>
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
          table-label="企画タグ一覧"
          empty-message="企画タグはまだありません。"
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
                  placeholder="タグID・タグ名で絞り込み"
                  class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button :class="buttonVariants({ variant: 'secondary', size: 'md' })" type="submit">
                  <FaIcon name="search" fixed-width />
                  絞り込み
                </button>
              </form>
              <p class="text-sm text-muted">
                現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全タグ:
                {{ rawRows.length }}
              </p>
            </ToolbarRow>
            <ToolbarRow>
              <BaseButton variant="primary" size="md" weight="semibold" @click="openCreateEditor">
                <FaIcon name="plus" fixed-width />
                新規タグ
              </BaseButton>
              <CsvExportLink :href="exportHref">CSVで出力(タグ別企画一覧)</CsvExportLink>
            </ToolbarRow>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center gap-1">
              <IconActionButton title="編集" @click="openEditEditor(resolveRowId(row))">
                <FaIcon name="pencil-alt" fixed-width />
              </IconActionButton>
              <IconActionButton
                v-if="canDelete"
                variant="danger"
                title="削除"
                :disabled="deleteTagMutation.isPending.value"
                @click="handleDeleteTag(row)"
              >
                <FaIcon name="trash" fixed-width />
              </IconActionButton>
            </div>
          </template>

          <template #cell-name="{ value }">
            <span class="font-medium text-body">{{ value }}</span>
          </template>

          <template #cell-createdAt="{ value }">
            <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
          </template>

          <template #cell-updatedAt="{ value }">
            <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
          </template>
        </StaffDataGrid>
      </DataCard>
    </StaffSideWindowContainer>

    <StaffSideWindow :is-open="isEditorOpen" @click-close="closeEditor">
      <template #title>
        {{ selectedTag ? 'タグを編集' : '新規タグ' }}
      </template>
      <StaffTagEditor :tag="selectedTag" @deleted="handleDeleted" @saved="handleSaved" />
    </StaffSideWindow>

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
  </PageLayout>
</template>
