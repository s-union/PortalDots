<script setup lang="ts">
definePage({
  path: '/staff/circles/participation_types/:typeId',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.participationTypes'
  }
})

import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer, {
  type StaffFilterField,
  type StaffFilterMode,
  type StaffFilterOperator,
  type StaffFilterQuery
} from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { canAccessCircleMail, canDeleteCircles, canEditCircles } from '@/features/staff/access/capabilities'
import { extractStaffCircleValidationMessage, useDeleteStaffCircleMutation } from '@/features/staff/circles/api'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  buildStaffParticipationTypeCirclesExportUrl,
  type StaffParticipationTypeCircle,
  useAllStaffParticipationTypeCirclesQuery,
  useStaffParticipationTypeDetailQuery
} from '@/features/staff/participation-types/api'
import { useSessionStore } from '@/features/session/store'
import { buildStaffParticipationTypeTabs } from '@/features/ui/tabStrip'

const route = useRoute('/staff/circles/participation_types/[typeId]/')
const typeId = computed(() => String(route.params.typeId ?? ''))
const { enabled } = useAuthorizedStaffContext({ capability: 'circles.participationTypes' })
const detailQuery = useStaffParticipationTypeDetailQuery(typeId, enabled)
const allCirclesQuery = useAllStaffParticipationTypeCirclesQuery(typeId, enabled)
const sessionStore = useSessionStore()

const circlesPage = ref(1)
const circlesPageSize = ref(25)
const circlesSortKey = ref<StaffParticipationTypeCirclesSortKey>('id')
const circlesSortDirection = ref<'asc' | 'desc'>('asc')
const deletingCircleId = ref('')
const deleteCircleMutation = useDeleteStaffCircleMutation(computed(() => deletingCircleId.value))
const errorMessage = ref('')
const searchQuery = ref('')
const isFilterOpen = ref(false)
const nextFilterId = ref(1)
const appliedFilterMode = ref<StaffFilterMode>('and')
const appliedFilterQueries = ref<StaffFilterQuery[]>([])
const draftFilterMode = ref<StaffFilterMode>('and')
const draftFilterQueries = ref<StaffFilterQuery[]>([])

const circlesExportUrl = computed(() => buildStaffParticipationTypeCirclesExportUrl(typeId.value))

const uploadsUrl = computed(() => {
  const formId = detailQuery.data.value?.form.id
  if (!formId) {
    return undefined
  }
  return `/staff/forms/${encodeURIComponent(formId)}/answers/uploads`
})

const participationTypeTabs = computed(() =>
  buildStaffParticipationTypeTabs(typeId.value, 'circles', detailQuery.data.value?.form)
)

const canEdit = computed(() => canEditCircles(sessionStore.roles, sessionStore.permissions))
const canDelete = computed(() => canDeleteCircles(sessionStore.roles, sessionStore.permissions))
const canSendEmail = computed(() => canAccessCircleMail(sessionStore.roles, sessionStore.permissions))

const circlesColumns: StaffDataGridColumn[] = [
  { key: 'name', label: '企画名', sortable: true },
  { key: 'groupName', label: '企画グループ名', sortable: true },
  { key: 'status', label: '受理状況', sortable: true },
  { key: 'places', label: '使用場所' }
]

const filterFields: StaffFilterField[] = [
  { key: 'id', label: '企画ID', type: 'string' },
  { key: 'name', label: '企画名', type: 'string' },
  { key: 'groupName', label: '企画グループ名', type: 'string' },
  { key: 'status', label: '受理状況', type: 'string' },
  { key: 'places', label: '使用場所', type: 'string' }
]

type StaffParticipationTypeCirclesSortKey = 'id' | 'name' | 'groupName' | 'status'

const circlesSortKeys = ['id', 'name', 'groupName', 'status'] as const

const circlesRows = computed(() => allCirclesQuery.data.value ?? [])

const filteredRows = computed(() => {
  const normalizedSearch = searchQuery.value.trim().toLowerCase()
  const queries = appliedFilterQueries.value
  const mode = appliedFilterMode.value

  return circlesRows.value.filter((circle) => {
    if (normalizedSearch.length > 0 && !matchesSearch(circle, normalizedSearch)) {
      return false
    }

    if (queries.length === 0) {
      return true
    }

    if (mode === 'or') {
      return queries.some((query) => matchesFilterQuery(circle, query))
    }

    return queries.every((query) => matchesFilterQuery(circle, query))
  })
})

const sortedRows = computed(() => sortCirclesRows(filteredRows.value, circlesSortKey.value, circlesSortDirection.value))

const pagedRows = computed(() => {
  const start = (circlesPage.value - 1) * circlesPageSize.value
  const end = start + circlesPageSize.value
  return sortedRows.value.slice(start, end)
})

const circlesGridRows = computed<StaffDataGridRow[]>(() =>
  pagedRows.value.map((circle) => ({
    id: circle.id,
    name: circle.name,
    groupName: circle.groupName,
    status: circle.status,
    places: circle.places
  }))
)

const filterActive = computed(() => searchQuery.value.trim().length > 0 || appliedFilterQueries.value.length > 0)

watch(
  () => [sortedRows.value.length, circlesPageSize.value] as const,
  ([total, pageSize]) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    if (circlesPage.value > totalPages) {
      circlesPage.value = totalPages
    }
  }
)

function handleCirclesSort(nextKey: string) {
  if (!isStaffParticipationTypeCirclesSortKey(nextKey)) {
    return
  }

  if (circlesSortKey.value === nextKey) {
    circlesSortDirection.value = circlesSortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  circlesSortKey.value = nextKey
  circlesSortDirection.value = 'asc'
}

function handleCirclesFirstPage() {
  circlesPage.value = 1
}

function handleCirclesPrevPage() {
  circlesPage.value = Math.max(1, circlesPage.value - 1)
}

function handleCirclesNextPage() {
  const totalPages = Math.max(1, Math.ceil(sortedRows.value.length / circlesPageSize.value))
  circlesPage.value = Math.min(totalPages, circlesPage.value + 1)
}

function handleCirclesLastPage() {
  circlesPage.value = Math.max(1, Math.ceil(sortedRows.value.length / circlesPageSize.value))
}

function handleCirclesPageSizeChange(nextSize: number) {
  circlesPageSize.value = nextSize
  circlesPage.value = 1
}

async function handleCirclesReload() {
  if (typeof allCirclesQuery.refetch === 'function') {
    await allCirclesQuery.refetch()
  }
}

function handleSearch() {
  circlesPage.value = 1
}

async function handleDeleteCircle(circleId: string, circleName: string) {
  if (
    typeof window !== 'undefined' &&
    !window.confirm(
      `企画「${circleName}」を削除しますか？\n\n• 「${circleName}」が送信した申請の回答はすべて削除されます。`
    )
  ) {
    return
  }

  errorMessage.value = ''
  deletingCircleId.value = circleId

  try {
    await deleteCircleMutation.mutateAsync()
  } catch (error) {
    errorMessage.value = extractStaffCircleValidationMessage(error)
  } finally {
    deletingCircleId.value = ''
  }
}

function openFilter() {
  draftFilterQueries.value = appliedFilterQueries.value.map((query) => ({ ...query }))
  draftFilterMode.value = appliedFilterMode.value
  syncNextFilterId()
  isFilterOpen.value = true
}

function closeFilter() {
  isFilterOpen.value = false
}

function handleAddFilter(keyName: string) {
  if (!isStaffParticipationCircleFilterKey(keyName)) {
    return
  }

  draftFilterQueries.value = [
    ...draftFilterQueries.value,
    {
      id: nextFilterId.value++,
      keyName,
      operator: 'like',
      value: ''
    }
  ]
}

function handleRemoveFilter(queryId: number) {
  draftFilterQueries.value = draftFilterQueries.value.filter((query) => query.id !== queryId)
}

function handleUpdateFilter(queryId: number, patch: Partial<Omit<StaffFilterQuery, 'id'>>) {
  draftFilterQueries.value = draftFilterQueries.value.map((query) => {
    if (query.id !== queryId) {
      return query
    }

    return {
      ...query,
      ...patch
    }
  })
}

function handleFilterModeUpdate(mode: StaffFilterMode) {
  draftFilterMode.value = mode
}

function handleApplyFilters() {
  appliedFilterQueries.value = draftFilterQueries.value
    .filter((query) => isStaffParticipationCircleFilterKey(query.keyName))
    .map((query) => ({
      ...query,
      operator: normalizeFilterOperator(query.operator)
    }))
  appliedFilterMode.value = draftFilterMode.value
  circlesPage.value = 1
  closeFilter()
}

function handleClearFilters() {
  appliedFilterQueries.value = []
  draftFilterQueries.value = []
  appliedFilterMode.value = 'and'
  draftFilterMode.value = 'and'
  circlesPage.value = 1
  closeFilter()
}

function syncNextFilterId() {
  const maxId = draftFilterQueries.value.reduce((max, query) => Math.max(max, query.id), 0)
  nextFilterId.value = maxId + 1
}

function statusTone(status: string) {
  if (status === 'approved') {
    return 'success' as const
  }
  if (status === 'rejected') {
    return 'danger' as const
  }
  return 'muted' as const
}

function statusLabel(status: string) {
  if (status === 'approved') {
    return '受理'
  }
  if (status === 'rejected') {
    return '不受理'
  }
  return '審査中'
}

function isStaffParticipationTypeCirclesSortKey(value: string): value is StaffParticipationTypeCirclesSortKey {
  return (circlesSortKeys as readonly string[]).includes(value)
}

function isStaffParticipationCircleFilterKey(value: string) {
  return filterFields.some((field) => field.key === value)
}

function sortCirclesRows(
  rows: StaffParticipationTypeCircle[],
  key: StaffParticipationTypeCirclesSortKey,
  direction: 'asc' | 'desc'
) {
  const sorted = [...rows]
  const order = direction === 'asc' ? 1 : -1

  sorted.sort((left, right) => {
    const leftValue = resolveCircleSortValue(left, key)
    const rightValue = resolveCircleSortValue(right, key)

    if (leftValue < rightValue) {
      return -order
    }
    if (leftValue > rightValue) {
      return order
    }
    return 0
  })

  return sorted
}

function resolveCircleSortValue(circle: StaffParticipationTypeCircle, key: StaffParticipationTypeCirclesSortKey) {
  if (key === 'id') {
    return circle.id.toLowerCase()
  }
  if (key === 'name') {
    return circle.name.toLowerCase()
  }
  if (key === 'groupName') {
    return circle.groupName.toLowerCase()
  }
  return circle.status.toLowerCase()
}

function matchesSearch(circle: StaffParticipationTypeCircle, normalizedSearch: string) {
  const haystack = [circle.id, circle.name, circle.groupName, statusLabel(circle.status), circle.places.join(' ')]
    .join(' ')
    .toLowerCase()
  return haystack.includes(normalizedSearch)
}

function normalizeFilterOperator(operator: StaffFilterOperator): StaffFilterOperator {
  if (operator === '=' || operator === '!=' || operator === 'not like') {
    return operator
  }
  return 'like'
}

function resolveFilterValue(circle: StaffParticipationTypeCircle, keyName: string) {
  if (keyName === 'id') {
    return circle.id
  }
  if (keyName === 'name') {
    return circle.name
  }
  if (keyName === 'groupName') {
    return circle.groupName
  }
  if (keyName === 'status') {
    return statusLabel(circle.status)
  }
  if (keyName === 'places') {
    return circle.places.join(' ')
  }
  return ''
}

function matchesFilterQuery(circle: StaffParticipationTypeCircle, query: StaffFilterQuery) {
  if (!isStaffParticipationCircleFilterKey(query.keyName)) {
    return true
  }

  const left = resolveFilterValue(circle, query.keyName).toLowerCase()
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
</script>

<template>
  <StaffSideWindowContainer :is-open="isFilterOpen">
    <PageLayout class="max-w-full">
      <TabStrip v-if="detailQuery.data.value" :tabs="participationTypeTabs" />

      <div v-if="detailQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
        読み込み中...
      </div>

      <template v-else-if="detailQuery.data.value">
        <SurfaceCard tag="header">
          <h2 class="text-3xl font-semibold text-body">{{ detailQuery.data.value.name }}</h2>
          <p class="mt-3 text-sm text-muted">{{ detailQuery.data.value.description || '説明は未設定です。' }}</p>
        </SurfaceCard>

        <DataCard title="企画一覧" description="この参加種別に登録された企画を確認できます。" overflow-hidden>
          <template #actions>
            <div class="flex flex-wrap gap-2">
              <a
                :href="circlesExportUrl"
                class="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-2 text-xs text-body transition hover:bg-surface-light"
              >
                <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
                CSVで出力
              </a>
              <RouterLink
                v-if="uploadsUrl"
                :to="uploadsUrl"
                class="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-2 text-xs text-body transition hover:bg-surface-light"
              >
                <i class="far fa-file-archive fa-fw" aria-hidden="true" />
                ファイルを一括ダウンロード
              </RouterLink>
            </div>
          </template>

          <StaffDataGrid
            :rows="circlesGridRows"
            :columns="circlesColumns"
            :page="circlesPage"
            :page-size="circlesPageSize"
            :total="sortedRows.length"
            :loading="allCirclesQuery.isPending.value"
            :sort-key="circlesSortKey"
            :sort-direction="circlesSortDirection"
            :show-filter-button="true"
            :filter-active="filterActive"
            :per-page-options="[10, 25, 50, 100, 250, 500]"
            empty-message="この参加種別に紐づく企画はありません。"
            table-label="staff participation type circles"
            @first="handleCirclesFirstPage"
            @prev="handleCirclesPrevPage"
            @next="handleCirclesNextPage"
            @last="handleCirclesLastPage"
            @reload="handleCirclesReload"
            @sort="handleCirclesSort"
            @filter="openFilter"
            @update:page-size="handleCirclesPageSizeChange"
          >
            <template #toolbar>
              <div class="flex flex-wrap items-center gap-3">
                <form class="flex items-center gap-2" @submit.prevent="handleSearch">
                  <input
                    v-model="searchQuery"
                    type="search"
                    placeholder="企画名・団体名・使用場所で絞り込み"
                    class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    class="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-2 text-sm text-body transition hover:bg-surface-light"
                  >
                    <i class="fas fa-search fa-fw" aria-hidden="true" />
                    絞り込み
                  </button>
                </form>
                <p class="text-sm text-muted">
                  現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全企画:
                  {{ circlesRows.length }}
                </p>
              </div>
            </template>

            <template #actions="{ row }">
              <div class="flex items-center gap-2">
                <RouterLink
                  v-if="canEdit"
                  :to="`/staff/circles/${encodeURIComponent(String(row.id))}`"
                  class="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-body transition hover:bg-surface-light"
                  title="編集"
                >
                  <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
                </RouterLink>
                <RouterLink
                  v-if="canSendEmail"
                  :to="`/staff/circles/${encodeURIComponent(String(row.id))}/email`"
                  class="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-body transition hover:bg-surface-light"
                  title="メール送信"
                >
                  <i class="far fa-envelope fa-fw" aria-hidden="true" />
                </RouterLink>
                <button
                  v-if="canDelete"
                  class="inline-flex h-8 w-8 items-center justify-center rounded border border-danger text-danger transition hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  title="削除"
                  :disabled="deleteCircleMutation.isPending.value"
                  @click="handleDeleteCircle(String(row.id), String(row.name))"
                >
                  <i class="fas fa-trash fa-fw" aria-hidden="true" />
                </button>
              </div>
            </template>

            <template #cell-name="{ row, value }">
              <RouterLink
                :to="`/staff/circles/${encodeURIComponent(String(row.id))}`"
                class="font-medium text-primary hover:underline"
              >
                {{ String(value) }}
              </RouterLink>
            </template>

            <template #cell-status="{ value }">
              <StatusBadge :tone="statusTone(String(value))" size="sm">
                {{ statusLabel(String(value)) }}
              </StatusBadge>
            </template>

            <template #cell-places="{ value }">
              <div class="flex flex-wrap gap-1">
                <StatusBadge v-for="place in value as string[]" :key="place" tone="muted" size="sm">
                  {{ place }}
                </StatusBadge>
                <span v-if="Array.isArray(value) && value.length === 0" class="text-muted">-</span>
              </div>
            </template>
          </StaffDataGrid>
        </DataCard>

        <AlertMessage v-if="errorMessage" tone="danger">
          {{ errorMessage }}
        </AlertMessage>
      </template>

      <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
        参加種別を取得できませんでした。
      </div>
    </PageLayout>
  </StaffSideWindowContainer>

  <StaffSideWindow :is-open="isFilterOpen" title="絞り込み" @click-close="closeFilter">
    <StaffFilterDrawer
      :fields="filterFields"
      :queries="draftFilterQueries"
      :mode="draftFilterMode"
      :loading="allCirclesQuery.isPending.value"
      @add="handleAddFilter"
      @remove="handleRemoveFilter"
      @update-query="handleUpdateFilter"
      @update-mode="handleFilterModeUpdate"
      @apply="handleApplyFilters"
      @clear="handleClearFilters"
    />
  </StaffSideWindow>
</template>
