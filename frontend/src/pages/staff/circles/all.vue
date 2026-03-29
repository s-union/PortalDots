<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.read'
  }
})

import { computed, ref, watch } from 'vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
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
import { canAccessCircleMail, canDeleteCircles, canEditCircles } from '@/features/staff/access/capabilities'
import {
  buildStaffCirclesExportUrl,
  extractStaffCircleValidationMessage,
  useAllStaffCirclesQuery,
  useCreateStaffCircleMutation,
  useDeleteStaffCircleMutation,
  useStaffCircleForm
} from '@/features/staff/circles/api'
import { useStaffPlacesQuery } from '@/features/staff/masters/places'
import { useStaffParticipationTypesQuery } from '@/features/staff/participation-types/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const allCirclesQuery = useAllStaffCirclesQuery(enabled)
const participationTypesQuery = useStaffParticipationTypesQuery(enabled)
const placesQuery = useStaffPlacesQuery(enabled)
const createCircleMutation = useCreateStaffCircleMutation()
const deletingCircleId = ref('')
const deleteCircleMutation = useDeleteStaffCircleMutation(computed(() => deletingCircleId.value))
const form = useStaffCircleForm()

const page = ref(1)
const pageSize = ref(25)
const searchQuery = ref('')
const sortKey = ref<StaffCircleSortKey>('id')
const sortDirection = ref<'asc' | 'desc'>('asc')
const isFilterOpen = ref(false)
const nextFilterId = ref(1)
const appliedFilterMode = ref<StaffFilterMode>('and')
const appliedFilterQueries = ref<StaffFilterQuery[]>([])
const draftFilterMode = ref<StaffFilterMode>('and')
const draftFilterQueries = ref<StaffFilterQuery[]>([])
const errorMessage = ref('')
const exportUrl = buildStaffCirclesExportUrl()

const canEdit = computed(() => canEditCircles(sessionStore.roles, sessionStore.permissions))
const canDelete = computed(() => canDeleteCircles(sessionStore.roles, sessionStore.permissions))
const canSendEmail = computed(() => canAccessCircleMail(sessionStore.roles, sessionStore.permissions))

const filterFields: StaffFilterField[] = [
  { key: 'id', label: '企画ID', type: 'string' },
  { key: 'participationTypeName', label: '参加種別', type: 'string' },
  { key: 'name', label: '企画名', type: 'string' },
  { key: 'nameYomi', label: '企画名(よみ)', type: 'string' },
  { key: 'groupName', label: '企画を出店する団体の名称', type: 'string' },
  { key: 'groupNameYomi', label: '企画を出店する団体の名称(よみ)', type: 'string' },
  { key: 'status', label: '受理状況', type: 'string' },
  { key: 'tags', label: 'タグ', type: 'string' },
  { key: 'places', label: '使用場所', type: 'string' }
]

const columns: StaffDataGridColumn[] = [
  { key: 'participationTypeName', label: '参加種別', sortable: true },
  { key: 'name', label: '企画名', sortable: true },
  { key: 'nameYomi', label: '企画名(よみ)', sortable: true },
  { key: 'groupName', label: '企画を出店する団体の名称', sortable: true },
  { key: 'groupNameYomi', label: '企画を出店する団体の名称(よみ)', sortable: true },
  { key: 'tags', label: 'タグ' },
  { key: 'notes', label: 'スタッフ用メモ', sortable: true },
  { key: 'submittedAt', label: '参加登録提出日時', sortable: true },
  { key: 'status', label: '受理状況', sortable: true },
  { key: 'places', label: '使用場所' }
]

interface StaffCircleRow {
  id: string
  name: string
  nameYomi: string
  groupName: string
  groupNameYomi: string
  participationTypeName: string
  tags: string[]
  notes: string
  submittedAt: string | null
  status: string
  places: string[]
}

const rows = computed<StaffCircleRow[]>(() => allCirclesQuery.data.value ?? [])

const filteredRows = computed<StaffCircleRow[]>(() => {
  const normalizedSearch = searchQuery.value.trim().toLowerCase()
  const queries = appliedFilterQueries.value
  const mode = appliedFilterMode.value

  return rows.value.filter((row) => {
    if (normalizedSearch.length > 0 && !matchesSearch(row, normalizedSearch)) {
      return false
    }

    if (queries.length === 0) {
      return true
    }

    if (mode === 'or') {
      return queries.some((query) => matchesFilterQuery(row, query))
    }

    return queries.every((query) => matchesFilterQuery(row, query))
  })
})

const sortedRows = computed<StaffCircleRow[]>(() => {
  const cloned = [...filteredRows.value]
  const direction = sortDirection.value === 'asc' ? 1 : -1
  const key = sortKey.value

  cloned.sort((left, right) => {
    const leftValue = resolveCircleSortValue(left, key)
    const rightValue = resolveCircleSortValue(right, key)

    if (leftValue < rightValue) {
      return -1 * direction
    }
    if (leftValue > rightValue) {
      return direction
    }
    return 0
  })

  return cloned
})

const pagedRows = computed<StaffCircleRow[]>(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedRows.value.slice(start, end)
})

const gridRows = computed<StaffDataGridRow[]>(() => pagedRows.value.map((circle) => ({ ...circle })))

const filterActive = computed(() => searchQuery.value.trim().length > 0 || appliedFilterQueries.value.length > 0)

watch(
  () => [sortedRows.value.length, pageSize.value] as const,
  ([total, currentPageSize]) => {
    const totalPages = Math.max(1, Math.ceil(total / currentPageSize))
    if (page.value > totalPages) {
      page.value = totalPages
    }
  }
)

async function handleCreateCircle() {
  errorMessage.value = ''

  try {
    await createCircleMutation.mutateAsync({
      name: form.value.name,
      nameYomi: form.value.nameYomi,
      groupName: form.value.groupName,
      groupNameYomi: form.value.groupNameYomi,
      participationTypeId: form.value.participationTypeId,
      notes: form.value.notes,
      status: form.value.status,
      statusReason: form.value.statusReason,
      placeIds: form.value.placeIds
    })
    form.value = {
      name: '',
      nameYomi: '',
      groupName: '',
      groupNameYomi: '',
      participationTypeId: '',
      notes: '',
      status: 'pending',
      statusReason: '',
      placeIds: []
    }
  } catch (error) {
    errorMessage.value = extractStaffCircleValidationMessage(error)
  }
}

function handleSort(nextKey: string) {
  if (!isStaffCircleSortKey(nextKey)) {
    return
  }

  if (sortKey.value === nextKey) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortKey.value = nextKey
  sortDirection.value = 'asc'
}

function handleFirstPage() {
  page.value = 1
}

function handlePrevPage() {
  page.value = Math.max(1, page.value - 1)
}

function handleNextPage() {
  const totalPages = Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value))
  page.value = Math.min(totalPages, page.value + 1)
}

function handleLastPage() {
  page.value = Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value))
}

async function handleReload() {
  if (typeof allCirclesQuery.refetch === 'function') {
    await allCirclesQuery.refetch()
  }
}

function handlePageSizeChange(nextSize: number) {
  pageSize.value = nextSize
  page.value = 1
}

function handleSearch() {
  page.value = 1
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
  if (!isStaffCircleFilterKey(keyName)) {
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
    .filter((query) => isStaffCircleFilterKey(query.keyName))
    .map((query) => ({
      ...query,
      operator: normalizeFilterOperator(query.operator)
    }))
  appliedFilterMode.value = draftFilterMode.value
  page.value = 1
  closeFilter()
}

function handleClearFilters() {
  appliedFilterQueries.value = []
  draftFilterQueries.value = []
  appliedFilterMode.value = 'and'
  draftFilterMode.value = 'and'
  page.value = 1
  closeFilter()
}

function syncNextFilterId() {
  const maxId = draftFilterQueries.value.reduce((max, query) => Math.max(max, query.id), 0)
  nextFilterId.value = maxId + 1
}

function openCreateCircleCard() {
  if (typeof document === 'undefined') {
    return
  }
  const target = document.getElementById('create-circle-card')
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

const staffCircleSortKeys = [
  'id',
  'participationTypeName',
  'name',
  'nameYomi',
  'groupName',
  'groupNameYomi',
  'notes',
  'submittedAt',
  'status'
] as const
type StaffCircleSortKey = (typeof staffCircleSortKeys)[number]

function isStaffCircleSortKey(value: string): value is StaffCircleSortKey {
  return (staffCircleSortKeys as readonly string[]).includes(value)
}

function isStaffCircleFilterKey(value: string) {
  return filterFields.some((field) => field.key === value)
}

function resolveCircleSortValue(circle: StaffCircleRow, key: StaffCircleSortKey) {
  if (key === 'submittedAt') {
    return String(circle.submittedAt ?? '')
  }
  return String(circle[key]).toLowerCase()
}

function matchesSearch(circle: StaffCircleRow, normalizedSearch: string) {
  const haystack = [
    circle.id,
    circle.participationTypeName,
    circle.name,
    circle.nameYomi,
    circle.groupName,
    circle.groupNameYomi,
    circle.notes,
    statusLabel(circle.status),
    circle.tags.join(' '),
    circle.places.join(' ')
  ]
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

function resolveFilterValue(circle: StaffCircleRow, keyName: string) {
  if (keyName === 'tags') {
    return circle.tags.join(' ')
  }
  if (keyName === 'places') {
    return circle.places.join(' ')
  }
  if (keyName === 'status') {
    return statusLabel(circle.status)
  }
  if (keyName === 'id') {
    return circle.id
  }
  if (keyName === 'participationTypeName') {
    return circle.participationTypeName
  }
  if (keyName === 'name') {
    return circle.name
  }
  if (keyName === 'nameYomi') {
    return circle.nameYomi
  }
  if (keyName === 'groupName') {
    return circle.groupName
  }
  if (keyName === 'groupNameYomi') {
    return circle.groupNameYomi
  }
  return ''
}

function matchesFilterQuery(circle: StaffCircleRow, query: StaffFilterQuery) {
  if (!isStaffCircleFilterKey(query.keyName)) {
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
      <PageHeader title="企画情報管理 - 全企画一覧" />

      <DataCard title="企画一覧" overflow-hidden>
        <StaffDataGrid
          :rows="gridRows"
          :columns="columns"
          :page="page"
          :page-size="pageSize"
          :total="sortedRows.length"
          :loading="allCirclesQuery.isPending.value"
          :sort-key="sortKey"
          :sort-direction="sortDirection"
          :show-filter-button="true"
          :filter-active="filterActive"
          :per-page-options="[10, 25, 50, 100, 250, 500]"
          empty-message="企画はまだありません。"
          table-label="staff circles"
          @first="handleFirstPage"
          @prev="handlePrevPage"
          @next="handleNextPage"
          @last="handleLastPage"
          @reload="handleReload"
          @sort="handleSort"
          @filter="openFilter"
          @update:page-size="handlePageSizeChange"
        >
          <template #toolbar>
            <div class="grid w-full gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-if="canEdit"
                  class="inline-flex items-center gap-1 rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  type="button"
                  @click="openCreateCircleCard"
                >
                  <i class="fas fa-plus fa-fw" aria-hidden="true" />
                  新規企画
                </button>
                <a
                  :href="exportUrl"
                  class="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-2 text-sm text-body transition hover:bg-surface-light hover:no-underline"
                >
                  <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
                  CSVで出力
                </a>
                <RouterLink
                  class="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-2 text-sm text-body transition hover:bg-surface-light"
                  to="/staff/circles/participation_types"
                >
                  参加種別管理
                </RouterLink>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <form class="flex items-center gap-2" @submit.prevent="handleSearch">
                  <input
                    v-model="searchQuery"
                    type="search"
                    placeholder="企画ID・企画名・団体名などで絞り込み"
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

                <div class="text-sm text-muted">
                  現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全企画:
                  {{ rows.length }}
                </div>
              </div>
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

          <template #cell-participationTypeName="{ value }">
            <StatusBadge tone="primary" size="sm">{{ String(value) }}</StatusBadge>
          </template>

          <template #cell-tags="{ value }">
            <div class="flex flex-wrap gap-1">
              <StatusBadge v-for="tag in value as string[]" :key="tag" tone="muted" size="sm">{{ tag }}</StatusBadge>
            </div>
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
            </div>
          </template>
        </StaffDataGrid>
      </DataCard>

      <div id="create-circle-card">
        <DataCard title="企画を新規作成">
          <form @submit.prevent="handleCreateCircle">
            <div class="grid gap-4 px-6 py-5">
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画名</span>
                <input
                  v-model="form.name"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="name"
                  type="text"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画名(よみ)</span>
                <input
                  v-model="form.nameYomi"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="nameYomi"
                  type="text"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画を出店する団体の名称</span>
                <input
                  v-model="form.groupName"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="groupName"
                  type="text"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">企画を出店する団体の名称(よみ)</span>
                <input
                  v-model="form.groupNameYomi"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="groupNameYomi"
                  type="text"
                />
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">参加種別</span>
                <select
                  v-model="form.participationTypeId"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="participationTypeId"
                >
                  <option value="">参加種別を選択してください</option>
                  <option
                    v-for="participationType in participationTypesQuery.data.value ?? []"
                    :key="participationType.id"
                    :value="participationType.id"
                  >
                    {{ participationType.name }}
                  </option>
                </select>
              </label>
              <label class="grid gap-2 text-sm text-body">
                <span class="font-medium">スタッフ用メモ</span>
                <textarea
                  v-model="form.notes"
                  class="min-h-24 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="notes"
                />
              </label>
              <div class="grid gap-2 text-sm text-body">
                <span class="font-medium">登録受理状況</span>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2">
                    <input v-model="form.status" type="radio" name="status" value="pending" />
                    審査中
                  </label>
                  <label class="flex items-center gap-2">
                    <input v-model="form.status" type="radio" name="status" value="approved" />
                    受理
                  </label>
                  <label class="flex items-center gap-2">
                    <input v-model="form.status" type="radio" name="status" value="rejected" />
                    不受理
                  </label>
                </div>
              </div>
              <label v-if="form.status === 'rejected'" class="grid gap-2 text-sm text-body">
                <span class="font-medium">不受理理由</span>
                <textarea
                  v-model="form.statusReason"
                  class="min-h-16 rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="statusReason"
                />
              </label>
              <div class="grid gap-2 text-sm text-body">
                <span class="font-medium">使用場所</span>
                <select
                  v-model="form.placeIds"
                  class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
                  name="placeIds"
                  multiple
                >
                  <option v-for="place in placesQuery.data.value ?? []" :key="place.id" :value="place.id">
                    {{ place.name }}
                  </option>
                </select>
                <p class="text-xs text-muted">Ctrl/Cmd を押しながらクリックで複数選択できます</p>
              </div>

              <AlertMessage v-if="errorMessage" tone="danger">
                {{ errorMessage }}
              </AlertMessage>
            </div>
            <div class="border-t border-border px-6 py-5">
              <button
                :class="cn(buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' }))"
                :disabled="createCircleMutation.isPending.value"
                type="submit"
              >
                {{ createCircleMutation.isPending.value ? '作成中...' : '保存' }}
              </button>
            </div>
          </form>
        </DataCard>
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
