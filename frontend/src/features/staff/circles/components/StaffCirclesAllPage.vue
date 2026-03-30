<script setup lang="ts">
import { computed } from 'vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { canAccessCircleMail, canDeleteCircles, canEditCircles } from '@/features/staff/access/capabilities'
import { useStaffCirclesAllPage } from '@/features/staff/circles/composables/useStaffCirclesAllPage'
import { statusTone, statusLabel } from '@/features/staff/circles/helpers/circleFilters'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import StaffCircleCreateCard from './StaffCircleCreateCard.vue'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)

const {
  allCirclesQuery,
  participationTypesQuery,
  placesQuery,
  createCircleMutation,
  deleteCircleMutation,
  form,
  errorMessage,
  exportUrl,
  searchQuery,
  isFilterOpen,
  draftFilterMode,
  draftFilterQueries,
  filterFields,
  rows,
  sortedRows,
  pagedRows,
  filterActive,
  sort,
  pagination,
  handleCreateCircle,
  handleSort,
  handleReload,
  handleSearch,
  handleDeleteCircle,
  openFilter,
  closeFilter,
  handleAddFilter,
  handleRemoveFilter,
  handleUpdateFilter,
  handleFilterModeUpdate,
  handleApplyFilters,
  handleClearFilters,
  openCreateCircleCard
} = useStaffCirclesAllPage({ enabled })

const canEdit = computed(() => canEditCircles(sessionStore.roles, sessionStore.permissions))
const canDelete = computed(() => canDeleteCircles(sessionStore.roles, sessionStore.permissions))
const canSendEmail = computed(() => canAccessCircleMail(sessionStore.roles, sessionStore.permissions))

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

const gridRows = computed<StaffDataGridRow[]>(() => pagedRows.value.map((circle) => ({ ...circle })))
</script>

<template>
  <StaffSideWindowContainer :is-open="isFilterOpen">
    <PageLayout class="max-w-full">
      <PageHeader eyebrow="Circles" title="全企画一覧" description="参加種別をまたいで企画を一覧管理します。">
        <template #actions>
          <RouterLink
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
            to="/staff/circles"
          >
            参加種別から探す
          </RouterLink>
          <RouterLink
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
            to="/staff/circles/participation_types"
          >
            参加種別管理
          </RouterLink>
        </template>
      </PageHeader>

      <DataCard title="企画一覧" description="全企画を横断して検索・絞り込みできます。" overflow-hidden>
        <template #actions>
          <a
            :href="exportUrl"
            class="inline-flex items-center gap-1 rounded border border-border bg-surface px-3 py-2 text-xs text-body transition hover:bg-surface-light hover:no-underline"
          >
            <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
            CSVで出力
          </a>
        </template>

        <StaffDataGrid
          :rows="gridRows"
          :columns="columns"
          :page="pagination.page.value"
          :page-size="pagination.pageSize.value"
          :total="sortedRows.length"
          :loading="allCirclesQuery.isPending.value"
          :sort-key="sort.sortKey.value"
          :sort-direction="sort.sortDirection.value"
          :show-filter-button="true"
          :filter-active="filterActive"
          :per-page-options="[10, 25, 50, 100, 250, 500]"
          empty-message="企画はまだありません。"
          table-label="staff circles"
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
            <div class="flex w-full flex-wrap items-center gap-3">
              <button
                v-if="canEdit"
                class="inline-flex items-center gap-1 rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                type="button"
                @click="openCreateCircleCard"
              >
                <i class="fas fa-plus fa-fw" aria-hidden="true" />
                新規企画
              </button>

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

              <p class="text-sm text-muted">
                現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全企画:
                {{ rows.length }}
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

      <StaffCircleCreateCard
        v-model:form="form"
        :participation-types="participationTypesQuery.data.value ?? []"
        :places="placesQuery.data.value ?? []"
        :error-message="errorMessage"
        :is-pending="createCircleMutation.isPending.value"
        @submit="handleCreateCircle"
      />
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
