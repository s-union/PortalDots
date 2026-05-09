<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms',
  meta: staffPageMeta('forms.read')
})

import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import CsvExportLink from '@/components/ui/CsvExportLink.vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StaffFilterDrawer, { type StaffFilterField } from '@/components/staff/StaffFilterDrawer.vue'
import StaffSideWindow from '@/components/staff/StaffSideWindow.vue'
import StaffSideWindowContainer from '@/components/staff/StaffSideWindowContainer.vue'
import ToolbarRow from '@/components/ui/ToolbarRow.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import DataCard from '@/components/layouts/DataCard.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import { buttonVariants } from '@/lib/ui/variants'
import { canEditForms, canReadFormAnswers } from '@/features/staff/access/capabilities'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildCopyStaffFormConfirmMessage,
  buildDeleteStaffFormConfirmMessage,
  buildStaffFormsExportUrl,
  extractStaffFormValidationMessage,
  useCopyStaffFormMutation,
  useDeleteStaffFormMutation,
  useStaffFormsQuery
} from '@/features/staff/forms/api'
import { useSessionStore } from '@/features/session/store'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { useStaffDataGridFilters } from '@/lib/useStaffDataGridFilters'
import { compareString } from '@/lib/compareString'
import { resolveRowId, resolveTags } from '@/lib/dataGridHelpers'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import YesNo from '@/components/ui/YesNo.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const formsQuery = useStaffFormsQuery(computed(() => staffStatusQuery.data.value?.authorized === true))
const copyFormMutation = useCopyStaffFormMutation()
const deleteFormMutation = useDeleteStaffFormMutation()
const errorMessage = ref('')
const exportHref = computed(() => buildStaffFormsExportUrl())
const canReadAnswers = computed(() => canReadFormAnswers(sessionStore.roles, sessionStore.permissions))
const canEdit = computed(() => canEditForms(sessionStore.roles, sessionStore.permissions))
const detailActionTitle = computed(() => (canReadAnswers.value ? '回答一覧・設定' : '設定'))
const detailActionIcon = computed(() =>
  canReadAnswers.value ? ({ prefix: 'far', name: 'eye' } as const) : ({ prefix: 'fas', name: 'cog' } as const)
)

const sortKeys = [
  'formNumber',
  'name',
  'isPublic',
  'openAt',
  'closeAt',
  'createdAt',
  'updatedAt',
  'maxAnswers'
] as const
type StaffFormSortKey = (typeof sortKeys)[number]

const filterFields: StaffFilterField[] = [
  { key: 'id', label: 'フォームID', type: 'string' },
  { key: 'name', label: 'フォーム名', type: 'string' },
  { key: 'isPublic', label: '公開', type: 'bool' },
  { key: 'description', label: 'フォームの説明', type: 'string' },
  { key: 'openAt', label: '受付開始日時', type: 'string' },
  { key: 'closeAt', label: '受付終了日時', type: 'string' },
  { key: 'createdAt', label: '作成日時', type: 'string' },
  { key: 'updatedAt', label: '更新日時', type: 'string' },
  { key: 'maxAnswers', label: '最大回答数', type: 'string' }
]

function isFilterKey(key: string) {
  return filterFields.some((f) => f.key === key)
}

const formOrderMap = computed(() => {
  const order = new Map<string, number>()
  ;[...(formsQuery.data.value ?? [])]
    .sort((left, right) => compareString(left.id, right.id))
    .forEach((staffForm, index) => {
      order.set(staffForm.id, index + 1)
    })
  return order
})

const rawRows = computed<Record<string, unknown>[]>(() =>
  (formsQuery.data.value ?? []).map((staffForm) => ({
    ...staffForm,
    formNumber: String(formOrderMap.value.get(staffForm.id) ?? 0)
  }))
)

function resolveSortValue(row: Record<string, unknown>, key: StaffFormSortKey) {
  if (key === 'formNumber') {
    return String(row.formNumber ?? '0').padStart(10, '0')
  }
  if (key === 'isPublic') {
    return row.isPublic ? '1' : '0'
  }
  if (key === 'maxAnswers') {
    return String(row.maxAnswers ?? 0).padStart(10, '0')
  }
  return String(row[key] ?? '').toLowerCase()
}

function matchesSearch(row: Record<string, unknown>, search: string) {
  const haystack = [row.id, row.name, row.description, row.formNumber].join(' ').toLowerCase()
  return haystack.includes(search)
}

function matchesFilterQuery(row: Record<string, unknown>, query: { keyName: string; operator: string; value: string }) {
  const left = String(row[query.keyName] ?? '').toLowerCase()
  const right = query.value.trim().toLowerCase()

  if (query.keyName === 'isPublic') {
    const expected = right === 'true' || right === '1'
    if (query.operator === '=') {
      return row.isPublic === expected
    }
    if (query.operator === '!=') {
      return row.isPublic !== expected
    }
  }

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
} = useStaffDataGridFilters<Record<string, unknown>, StaffFormSortKey>({
  rows: rawRows,
  sortKeys,
  defaultSortKey: 'formNumber',
  filterFields,
  resolveSortValue,
  matchesSearch,
  matchesFilterQuery,
  isFilterKey
})

const columns: StaffDataGridColumn[] = [
  { key: 'formNumber', label: 'フォームID', sortable: true, align: 'right', cellClass: 'font-medium text-body' },
  { key: 'name', label: 'フォーム名', sortable: true },
  { key: 'isPublic', label: '公開', sortable: true, align: 'center' },
  { key: 'answerableTags', label: '回答可能なタグ' },
  { key: 'description', label: 'フォームの説明' },
  { key: 'openAt', label: '受付開始日時', sortable: true },
  { key: 'closeAt', label: '受付終了日時', sortable: true },
  { key: 'createdAt', label: '作成日時', sortable: true },
  { key: 'updatedAt', label: '更新日時', sortable: true }
]

const isBusy = computed(
  () =>
    formsQuery.isPending.value ||
    formsQuery.isFetching.value ||
    copyFormMutation.isPending.value ||
    deleteFormMutation.isPending.value
)

function findFormName(formId: string) {
  return formsQuery.data.value?.find((staffForm) => staffForm.id === formId)?.name ?? 'このフォーム'
}

async function handleCopyForm(formId: string) {
  const formName = findFormName(formId)
  if (typeof window !== 'undefined' && !window.confirm(buildCopyStaffFormConfirmMessage(formName))) {
    return
  }

  errorMessage.value = ''
  try {
    const copied = await copyFormMutation.mutateAsync(formId)
    if (copied?.id) {
      await router.push(`/staff/forms/${encodeURIComponent(copied.id)}/editor`)
    }
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error)
  }
}

async function handleDeleteForm(formId: string) {
  const formName = findFormName(formId)
  if (typeof window !== 'undefined' && !window.confirm(buildDeleteStaffFormConfirmMessage(formName))) {
    return
  }

  errorMessage.value = ''
  try {
    await deleteFormMutation.mutateAsync(formId)
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error)
  }
}

function resolveDetailPath(formId: string) {
  const encodedFormId = encodeURIComponent(formId)

  if (canReadAnswers.value) {
    return `/staff/forms/${encodedFormId}/answers`
  }
  if (canEdit.value) {
    return `/staff/forms/${encodedFormId}/edit`
  }

  return null
}

function resolveDescription(row: StaffDataGridRow) {
  const description = typeof row.description === 'string' ? row.description : ''
  if (description.trim().length === 0) {
    return '-'
  }
  return description
}

function navigateToDetail(formId: string) {
  const path = resolveDetailPath(formId)
  if (path) {
    router.push(path)
  }
}

async function handleReload() {
  await formsQuery.refetch()
}
</script>

<template>
  <StaffSideWindowContainer :is-open="isFilterOpen">
    <PageLayout fullWidth>
      <DataCard overflow-hidden>
        <AlertMessage v-if="errorMessage" class="mx-6 mt-4">{{ errorMessage }}</AlertMessage>

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
          table-label="申請フォーム一覧"
          empty-message="staff forms は見つかりませんでした。"
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
                  placeholder="フォームID・フォーム名・説明で絞り込み"
                  class="rounded border border-border bg-surface px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button :class="buttonVariants({ variant: 'secondary', size: 'md' })" type="submit">
                  <FaIcon name="search" fixed-width />
                  絞り込み
                </button>
              </form>

              <p class="text-sm text-muted">
                現在のページ件数: {{ pagedRows.length }} / 絞り込み後: {{ sortedRows.length }} / 全フォーム:
                {{ rawRows.length }}
              </p>
            </ToolbarRow>

            <ToolbarRow>
              <BaseButton to="/staff/forms/create" variant="primary" size="md" weight="semibold">
                <FaIcon name="plus" fixed-width />
                新規フォーム
              </BaseButton>
              <CsvExportLink :href="exportHref" download>CSVで出力</CsvExportLink>
            </ToolbarRow>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center gap-1">
              <IconActionButton
                v-if="resolveDetailPath(resolveRowId(row))"
                :title="detailActionTitle"
                @click="navigateToDetail(resolveRowId(row))"
              >
                <FaIcon :prefix="detailActionIcon.prefix" :name="detailActionIcon.name" fixed-width />
              </IconActionButton>
              <IconActionButton title="複製" :disabled="isBusy" @click="handleCopyForm(resolveRowId(row))">
                <FaIcon prefix="far" name="copy" fixed-width />
              </IconActionButton>
              <IconActionButton
                variant="danger"
                title="削除"
                :disabled="isBusy"
                @click="handleDeleteForm(resolveRowId(row))"
              >
                <FaIcon name="trash" fixed-width />
              </IconActionButton>
            </div>
          </template>

          <template #cell-formNumber="{ row }">
            <RouterLink
              v-if="resolveDetailPath(resolveRowId(row))"
              class="font-medium text-primary"
              :to="resolveDetailPath(resolveRowId(row))!"
            >
              {{ row.formNumber }}
            </RouterLink>
            <span v-else class="font-medium text-body">{{ row.formNumber }}</span>
          </template>

          <template #cell-name="{ row }">
            <RouterLink
              v-if="resolveDetailPath(resolveRowId(row))"
              class="font-medium text-primary"
              :to="resolveDetailPath(resolveRowId(row))!"
            >
              {{ row.name }}
            </RouterLink>
            <span v-else class="font-medium text-body">{{ row.name }}</span>
          </template>

          <template #cell-isPublic="{ value }">
            <YesNo :value="value === true" />
          </template>

          <template #cell-answerableTags="{ value }">
            <div class="flex flex-wrap gap-1">
              <template v-for="tag in resolveTags(value)" :key="tag">
                <StatusBadge tone="accent">
                  {{ tag }}
                </StatusBadge>
              </template>
              <span v-if="resolveTags(value).length === 0" class="text-muted">全体に公開</span>
            </div>
          </template>

          <template #cell-description="{ row }">
            <span class="whitespace-pre-wrap">{{ resolveDescription(row) }}</span>
          </template>

          <template #cell-openAt="{ value }">
            <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
          </template>

          <template #cell-closeAt="{ value }">
            <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
          </template>

          <template #cell-createdAt="{ value }">
            <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
          </template>

          <template #cell-updatedAt="{ value }">
            <span>{{ typeof value === 'string' ? formatDateTimeTable(value) : '-' }}</span>
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
      :loading="isBusy"
      @add="handleAddFilter"
      @remove="handleRemoveFilter"
      @update-query="handleUpdateFilter"
      @update-mode="handleFilterModeUpdate"
      @apply="handleApplyFilters"
      @clear="handleClearFilters"
    />
  </StaffSideWindow>
</template>
