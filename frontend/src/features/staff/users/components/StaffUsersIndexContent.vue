<script setup lang="ts">
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
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
  handleSort,
  handleUpdateFilter,
  isEditorOpen,
  isFilterOpen,
  openEditor,
  openFilter,
  pagination,
  selectedUserId,
  sort,
  usersQuery
} = useStaffUsersIndexPage()

const columns: StaffDataGridColumn[] = [
  { key: 'userNumber', label: 'ユーザーID', sortable: false, cellClass: 'font-medium text-body' },
  { key: 'loginIds', label: '学生番号', sortable: true },
  { key: 'lastName', label: '姓', sortable: true },
  { key: 'lastNameReading', label: '姓(よみ)', sortable: false },
  { key: 'firstName', label: '名', sortable: true },
  { key: 'firstNameReading', label: '名(よみ)', sortable: false },
  { key: 'contactEmail', label: '連絡先メールアドレス', sortable: true },
  { key: 'univemail', label: '学生用メールアドレス', sortable: false },
  { key: 'phoneNumber', label: '電話番号', sortable: true },
  { key: 'isStaff', label: 'スタッフ', sortable: true, align: 'center' },
  { key: 'isAdmin', label: '管理者', sortable: true, align: 'center' },
  { key: 'isEmailVerified', label: 'メール認証', sortable: true, align: 'center' },
  { key: 'isVerified', label: '本人確認', sortable: true, align: 'center' },
  { key: 'createdAt', label: '作成日時', sortable: true },
  { key: 'updatedAt', label: '更新日時', sortable: true }
]
</script>

<template>
  <StaffSideWindowContainer :is-open="isEditorOpen || isFilterOpen">
    <PageLayout class="max-w-full">
      <DataCard overflow-hidden>
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
            <a
              :href="exportUrl"
              class="inline-flex items-center gap-2 px-3 text-[1.05rem] text-primary transition hover:text-primary-hover hover:no-underline"
            >
              <i class="fas fa-file-csv fa-fw text-[0.95rem]" aria-hidden="true" />
              CSVで出力
            </a>
          </template>

          <template #actions="{ row }">
            <IconActionButton title="編集" variant="ghost" @click="openEditor(String(row.id))">
              <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
            </IconActionButton>
          </template>

          <template #cell-loginIds="{ row }">
            {{ row.studentId }}
          </template>

          <template #cell-contactEmail="{ value }">
            <span class="block min-w-[16rem]">{{ value }}</span>
          </template>

          <template #cell-univemail="{ value }">
            <span class="block min-w-[16rem]">{{ value }}</span>
          </template>

          <template #cell-isStaff="{ value }">
            {{ value === true ? 'はい' : '-' }}
          </template>

          <template #cell-isAdmin="{ value }">
            {{ value === true ? 'はい' : '-' }}
          </template>

          <template #cell-isEmailVerified="{ value }">
            {{ value === true ? '認証済み' : '未認証' }}
          </template>

          <template #cell-isVerified="{ value }">
            {{ value === true ? '確認済み' : '未確認' }}
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
