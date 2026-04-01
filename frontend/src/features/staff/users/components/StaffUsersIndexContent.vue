<script setup lang="ts">
import DataCard from '@/components/layouts/DataCard.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ToolbarRow from '@/components/ui/ToolbarRow.vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import { buttonVariants } from '@/lib/ui/variants'
import { useStaffUsersIndexPage } from '@/features/staff/users/composables/useStaffUsersIndexPage'
import StaffUserEditor from './StaffUserEditor.vue'

const {
  closeEditor,
  closeFilter,
  draftFilterMode,
  draftFilterQueries,
  editorPopUpUrl,
  exportUrl,
  filterActive,
  filterFields,
  gridRows,
  handleAddFilter,
  handleApplyFilters,
  handleClearFilters,
  handleDeleted,
  handleFilterModeUpdate,
  handleReload,
  handleRemoveFilter,
  handleSaved,
  handleSearch,
  handleSort,
  handleUpdateFilter,
  isEditorOpen,
  isFilterOpen,
  openEditor,
  openFilter,
  pagination,
  searchQuery,
  selectedUserId,
  sort,
  usersQuery
} = useStaffUsersIndexPage()

const columns: StaffDataGridColumn[] = [
  { key: 'lastName', label: '姓', sortable: true },
  { key: 'firstName', label: '名', sortable: true },
  { key: 'loginIds', label: '学生用メールアドレス', sortable: true },
  { key: 'contactEmail', label: '連絡先メールアドレス', sortable: true },
  { key: 'phoneNumber', label: '電話番号', sortable: true },
  { key: 'isStaff', label: 'スタッフ', sortable: true, align: 'center' },
  { key: 'isAdmin', label: '管理者', sortable: true, align: 'center' },
  { key: 'isEmailVerified', label: 'メール確認', sortable: true, align: 'center' },
  { key: 'isVerified', label: '本人確認', sortable: true, align: 'center' }
]
</script>

<template>
  <StaffSideWindowContainer :is-open="isEditorOpen || isFilterOpen">
    <PageLayout class="max-w-full">
      <PageHeader title="ユーザー情報管理" description="登録ユーザーを横断して検索・編集します。" />

      <DataCard title="ユーザー一覧" overflow-hidden>
        <StaffDataGrid
          :rows="gridRows"
          :columns="columns"
          :page="pagination.page.value"
          :page-size="pagination.pageSize.value"
          :total="usersQuery.data.value?.total ?? 0"
          :loading="usersQuery.isPending.value"
          :sort-key="sort.sortKey.value"
          :sort-direction="sort.sortDirection.value"
          :show-filter-button="true"
          :filter-active="filterActive"
          empty-message="対象ユーザーが見つかりませんでした。"
          table-label="staff users"
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
                  placeholder="姓名・メールアドレス・学生用メールアドレスで絞り込み"
                  class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button :class="buttonVariants({ variant: 'secondary', size: 'md' })" type="submit">
                  <i class="fas fa-search fa-fw" aria-hidden="true" />
                  絞り込み
                </button>
              </form>
              <a :href="exportUrl" :class="buttonVariants({ variant: 'secondary', size: 'md' })">
                <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
                CSVで出力
              </a>
            </ToolbarRow>
          </template>

          <template #actions="{ row }">
            <IconActionButton title="編集" variant="ghost" @click="openEditor(String(row.id))">
              <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
            </IconActionButton>
          </template>

          <template #cell-loginIds="{ value }">
            {{ Array.isArray(value) ? value.join(', ') : '-' }}
          </template>

          <template #cell-isStaff="{ value }">
            <StatusBadge :tone="value === true ? 'primary' : 'muted'" size="sm">
              {{ value === true ? 'スタッフ' : '-' }}
            </StatusBadge>
          </template>

          <template #cell-isAdmin="{ value }">
            <StatusBadge :tone="value === true ? 'primary' : 'muted'" size="sm">
              {{ value === true ? '管理者' : '-' }}
            </StatusBadge>
          </template>

          <template #cell-isEmailVerified="{ value }">
            <StatusBadge :tone="value === true ? 'success' : 'muted'" size="sm">
              {{ value === true ? '確認済み' : '未確認' }}
            </StatusBadge>
          </template>

          <template #cell-isVerified="{ value }">
            <StatusBadge :tone="value === true ? 'success' : 'danger'" size="sm">
              {{ value === true ? '確認済み' : '未確認' }}
            </StatusBadge>
          </template>
        </StaffDataGrid>
      </DataCard>
    </PageLayout>
  </StaffSideWindowContainer>

  <StaffSideWindow
    :is-open="isEditorOpen"
    :pop-up-url="editorPopUpUrl()"
    title="ユーザーを編集"
    @click-close="closeEditor"
  >
    <StaffUserEditor
      v-if="selectedUserId.length > 0"
      :user-id="selectedUserId"
      @deleted="handleDeleted"
      @saved="handleSaved"
    />
  </StaffSideWindow>

  <StaffSideWindow :is-open="isFilterOpen" title="絞り込み" @click-close="closeFilter">
    <StaffFilterDrawer
      :fields="filterFields"
      :queries="draftFilterQueries"
      :mode="draftFilterMode"
      :loading="usersQuery.isPending.value"
      @add="handleAddFilter"
      @remove="handleRemoveFilter"
      @update-query="handleUpdateFilter"
      @update-mode="handleFilterModeUpdate"
      @apply="handleApplyFilters"
      @clear="handleClearFilters"
    />
  </StaffSideWindow>
</template>
