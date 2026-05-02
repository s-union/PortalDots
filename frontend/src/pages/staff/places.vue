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
import StaffPlaceEditor from '@/components/staff/StaffPlaceEditor.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import { compareString } from '@/lib/compareString'
import { resolveRowId } from '@/lib/dataGridHelpers'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'
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
const isStaffPlaceSortKey = createSortKeyGuard(sortKeys)
const sort = useSortState<StaffPlaceSortKey>('placeNumber')

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

const sortedPlaces = computed(() => {
  const places = orderedPlaces.value
  const key = sort.sortKey.value
  const direction = sort.sortDirection.value
  const order = direction === 'asc' ? 1 : -1

  return [...places].sort((left, right) => {
    switch (key) {
      case 'placeNumber':
        return ((placeOrderMap.value.get(left.id) ?? 0) - (placeOrderMap.value.get(right.id) ?? 0)) * order
      case 'typeLabel':
        return compareString(placeTypeLabel(left.type), placeTypeLabel(right.type)) * order
      default:
        return compareString(String(left[key]), String(right[key])) * order
    }
  })
})

const pagination = usePaginationState(computed(() => sortedPlaces.value.length))

const rows = computed<StaffDataGridRow[]>(() => {
  const start = (pagination.page.value - 1) * pagination.pageSize.value
  const end = start + pagination.pageSize.value

  return sortedPlaces.value.slice(start, end).map((place) => ({
    id: place.id,
    placeNumber: String(placeOrderMap.value.get(place.id) ?? start + 1),
    name: place.name,
    typeLabel: placeTypeLabel(place.type),
    notes: place.notes,
    createdAt: formatDateTimeTable(place.createdAt),
    updatedAt: formatDateTimeTable(place.updatedAt)
  }))
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

function handleSort(nextSortKey: string) {
  if (isStaffPlaceSortKey(nextSortKey)) {
    sort.toggleSort(nextSortKey)
  }
}
</script>

<template>
  <PageLayout fullWidth>
    <StaffSideWindowContainer :is-open="isEditorOpen">
      <DataCard>
        <StaffDataGrid
          :rows="rows"
          :columns="columns"
          :page="pagination.page.value"
          :page-size="pagination.pageSize.value"
          :total="sortedPlaces.length"
          :loading="isBusy"
          :sort-key="sort.sortKey.value"
          :sort-direction="sort.sortDirection.value"
          :show-filter-button="true"
          table-label="場所一覧"
          empty-message="場所情報はまだありません。"
          @first="pagination.setFirstPage"
          @prev="pagination.setPrevPage"
          @next="pagination.setNextPage"
          @last="pagination.setLastPage"
          @reload="placesQuery.refetch()"
          @sort="handleSort"
          @update:page-size="pagination.setPageSize"
        >
          <template #toolbar>
            <BaseButton variant="primary" size="md" weight="semibold" @click="openCreateEditor">
              <FaIcon name="plus" fixed-width />
              新規場所
            </BaseButton>
            <CsvExportLink :href="exportHref">CSVで出力(場所別企画一覧)</CsvExportLink>
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
  </PageLayout>
</template>
