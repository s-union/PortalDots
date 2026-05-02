<script setup lang="ts">
import { computed } from 'vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ToolbarRow from '@/components/ui/ToolbarRow.vue'
import { buttonVariants } from '@/lib/ui/variants'
import { canAccessCircleMail, canDeleteCircles, canEditCircles } from '@/features/staff/access/capabilities'
import { useStaffCirclesAllPage } from '@/features/staff/circles/composables/useStaffCirclesAllPage'
import { statusTone, statusLabel } from '@/features/staff/circles/helpers/circleFilters'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import FaIcon from '@/components/ui/FaIcon.vue'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)

const {
  allCirclesQuery,
  deleteCircleMutation,
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
  handleClearFilters
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
    <PageLayout fullWidth>
      <DataCard title="全企画一覧" description="全企画を横断して検索・絞り込みできます。" overflow-hidden>
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <RouterLink :class="buttonVariants({ variant: 'secondary', size: 'xs' })" to="/staff/circles">
              参加種別から探す
            </RouterLink>
            <RouterLink
              :class="buttonVariants({ variant: 'secondary', size: 'xs' })"
              to="/staff/circles/participation_types"
            >
              参加種別管理
            </RouterLink>
            <a :href="exportUrl" :class="buttonVariants({ variant: 'secondary', size: 'xs' })">
              <FaIcon name="file-csv" fixed-width />
              CSVで出力
            </a>
            <RouterLink
              v-if="canEdit"
              :class="buttonVariants({ variant: 'primary', size: 'xs', weight: 'semibold' })"
              to="/staff/circles/create"
            >
              <FaIcon name="plus" fixed-width />
              新規企画
            </RouterLink>
          </div>
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
            <ToolbarRow>
              <form class="flex items-center gap-2" @submit.prevent="handleSearch">
                <input
                  v-model="searchQuery"
                  type="search"
                  placeholder="企画ID・企画名・団体名などで絞り込み"
                  class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button :class="buttonVariants({ variant: 'secondary', size: 'md' })" type="submit">
                  <FaIcon name="search" fixed-width />
                  絞り込み
                </button>
              </form>

              <p class="text-sm text-muted">
                現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全企画:
                {{ rows.length }}
              </p>
            </ToolbarRow>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center gap-2">
              <RouterLink
                v-if="canEdit"
                :to="`/staff/circles/${encodeURIComponent(String(row.id))}`"
                :class="buttonVariants({ variant: 'secondary', size: 'sm' })"
                title="編集"
              >
                <FaIcon name="pencil-alt" fixed-width />
              </RouterLink>
              <RouterLink
                v-if="canSendEmail"
                :to="`/staff/circles/${encodeURIComponent(String(row.id))}/email`"
                :class="buttonVariants({ variant: 'secondary', size: 'sm' })"
                title="メール送信"
              >
                <FaIcon prefix="far" name="envelope" fixed-width />
              </RouterLink>
              <IconActionButton
                v-if="canDelete"
                variant="danger"
                type="button"
                title="削除"
                :disabled="deleteCircleMutation.isPending.value"
                @click="handleDeleteCircle(String(row.id), String(row.name))"
              >
                <FaIcon name="trash" fixed-width />
              </IconActionButton>
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
