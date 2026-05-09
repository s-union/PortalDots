<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/places',
  meta: staffPageMeta('places.read')
})

import { computed, ref } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import BaseButton from '@/components/ui/BaseButton.vue'
import CsvExportLink from '@/components/ui/CsvExportLink.vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer, { type StaffFilterField } from '@/components/staff/StaffFilterDrawer.vue'
import StaffPlaceEditor from '@/components/staff/StaffPlaceEditor.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import ToolbarRow from '@/components/ui/ToolbarRow.vue'
import { buttonVariants } from '@/lib/ui/variants'
import { resolveRowId } from '@/lib/dataGridHelpers'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { useStaffDataGridFilters } from '@/lib/useStaffDataGridFilters'
import { useOrderedItems } from '@/lib/useStaffDataTable'
import { canDeletePlaces } from '@/features/staff/access/capabilities'
import {
  buildDeleteStaffPlaceConfirmMessage,
  buildStaffPlacesExportUrl,
  deleteStaffPlace,
  placeTypeLabel,
  useStaffPlacesQuery
} from '@/features/staff/masters/places'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import FaIcon from '@/components/ui/FaIcon.vue'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const placesQuery = useStaffPlacesQuery(enabled)
const exportHref = computed(() => buildStaffPlacesExportUrl())
const canDelete = computed(() => canDeletePlaces(sessionStore.roles, sessionStore.permissions))
const isEditorOpen = ref(false)
const selectedPlaceId = ref('')
const deletingPlaceId = ref('')

const deletePlaceMutation = useMutation({
  mutationFn: async () => deleteStaffPlace(deletingPlaceId.value, sessionStore.csrfToken),
  onSuccess: async () => {
    await placesQuery.refetch()
  }
})

const sortKeys = ['placeNumber', 'name', 'typeLabel', 'notes', 'createdAt', 'updatedAt'] as const
type StaffPlaceSortKey = (typeof sortKeys)[number]

const filterFields: StaffFilterField[] = [
  { key: 'id', label: '場所ID', type: 'string' },
  { key: 'name', label: '場所名', type: 'string' },
  { key: 'typeLabel', label: 'タイプ', type: 'string' },
  { key: 'notes', label: 'スタッフ用メモ', type: 'string' },
  { key: 'createdAt', label: '作成日時', type: 'string' },
  { key: 'updatedAt', label: '更新日時', type: 'string' }
]

function isFilterKey(key: string) {
  return filterFields.some((f) => f.key === key)
}

const columns: StaffDataGridColumn[] = [
  { key: 'placeNumber', label: '場所ID', sortable: true, align: 'right', cellClass: 'font-medium text-body' },
  { key: 'name', label: '場所名', sortable: true },
  { key: 'typeLabel', label: 'タイプ', sortable: true, align: 'center' },
  { key: 'notes', label: 'スタッフ用メモ', sortable: true },
  { key: 'createdAt', label: '作成日時', sortable: true },
  { key: 'updatedAt', label: '更新日時', sortable: true }
]

const { orderedItems: orderedPlaces, orderMap: placeOrderMap } = useOrderedItems(
  computed(() => placesQuery.data.value ?? [])
)

const rawRows = computed<Record<string, unknown>[]>(() =>
  orderedPlaces.value.map((place) => ({
    id: place.id,
    placeNumber: String(placeOrderMap.value.get(place.id) ?? 0),
    name: place.name,
    typeLabel: placeTypeLabel(place.type),
    notes: place.notes,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt
  }))
)

function resolveSortValue(row: Record<string, unknown>, key: StaffPlaceSortKey) {
  if (key === 'placeNumber') {
    return String(row.placeNumber ?? '0').padStart(10, '0')
  }
  return String(row[key] ?? '').toLowerCase()
}

function matchesSearch(row: Record<string, unknown>, search: string) {
  const haystack = [row.id, row.name, row.typeLabel, row.notes, row.placeNumber].join(' ').toLowerCase()
  return haystack.includes(search)
}

function matchesFilterQuery(row: Record<string, unknown>, query: { keyName: string; operator: string; value: string }) {
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
} = useStaffDataGridFilters<Record<string, unknown>, StaffPlaceSortKey>({
  rows: rawRows,
  sortKeys,
  defaultSortKey: 'placeNumber',
  filterFields,
  resolveSortValue,
  matchesSearch,
  matchesFilterQuery,
  isFilterKey
})

const selectedPlace = computed(() => orderedPlaces.value.find((place) => place.id === selectedPlaceId.value) ?? null)

const isBusy = computed(
  () => placesQuery.isPending.value || placesQuery.isFetching.value || deletePlaceMutation.isPending.value
)

function openCreateEditor() {
  selectedPlaceId.value = ''
  isEditorOpen.value = true
}

function openEditEditor(placeId: string) {
  selectedPlaceId.value = placeId
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
}

function handleSaved() {
  closeEditor()
}

function handleDeleted() {
  selectedPlaceId.value = ''
  closeEditor()
}

async function handleDeletePlace(row: StaffDataGridRow) {
  const placeId = resolveRowId(row)
  const place = orderedPlaces.value.find((value) => value.id === placeId)
  if (!place) {
    return
  }

  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffPlaceConfirmMessage(place.name))) {
    return
  }

  deletingPlaceId.value = place.id
  try {
    await deletePlaceMutation.mutateAsync()
    if (selectedPlaceId.value === place.id) {
      selectedPlaceId.value = ''
      closeEditor()
    }
  } finally {
    deletingPlaceId.value = ''
  }
}

async function handleReload() {
  await placesQuery.refetch()
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
          table-label="場所一覧"
          empty-message="場所情報はまだありません。"
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
                  placeholder="場所ID・場所名・タイプ・メモで絞り込み"
                  class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button :class="buttonVariants({ variant: 'secondary', size: 'md' })" type="submit">
                  <FaIcon name="search" fixed-width />
                  絞り込み
                </button>
              </form>
              <p class="text-sm text-muted">
                現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全場所:
                {{ rawRows.length }}
              </p>
            </ToolbarRow>
            <ToolbarRow>
              <BaseButton variant="primary" size="md" weight="semibold" @click="openCreateEditor">
                <FaIcon name="plus" fixed-width />
                新規場所
              </BaseButton>
              <CsvExportLink :href="exportHref">CSVで出力(場所別企画一覧)</CsvExportLink>
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
                :disabled="deletePlaceMutation.isPending.value"
                @click="handleDeletePlace(row)"
              >
                <FaIcon name="trash" fixed-width />
              </IconActionButton>
            </div>
          </template>

          <template #cell-name="{ value }">
            <span class="font-medium text-body">{{ value }}</span>
          </template>

          <template #cell-notes="{ value }">
            <span>{{ typeof value === 'string' && value.trim().length > 0 ? value : '-' }}</span>
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
        {{ selectedPlace ? '場所を編集' : '新規場所' }}
      </template>
      <StaffPlaceEditor :place="selectedPlace" @deleted="handleDeleted" @saved="handleSaved" />
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
