<script setup lang="ts">
definePage({
  path: '/staff/forms',
  meta: staffPageMeta('forms.read')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import CsvExportLink from '@/components/ui/CsvExportLink.vue'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import DataCard from '@/components/layouts/DataCard.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
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
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'
import { compareBoolean, compareString } from '@/lib/compareString'
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
const isStaffFormSortKey = createSortKeyGuard(sortKeys)

const sort = useSortState<StaffFormSortKey>('formNumber')

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

const formOrderMap = computed(() => {
  const order = new Map<string, number>()
  ;[...(formsQuery.data.value ?? [])]
    .sort((left, right) => compareString(left.id, right.id))
    .forEach((staffForm, index) => {
      order.set(staffForm.id, index + 1)
    })
  return order
})

const sortedForms = computed(() => {
  const forms = formsQuery.data.value ?? []
  const key = sort.sortKey.value
  const direction = sort.sortDirection.value

  return [...forms].sort((left, right) => {
    const order = direction === 'asc' ? 1 : -1
    switch (key) {
      case 'formNumber':
        return ((formOrderMap.value.get(left.id) ?? 0) - (formOrderMap.value.get(right.id) ?? 0)) * order
      case 'isPublic':
        return compareBoolean(left.isPublic, right.isPublic) * order
      case 'maxAnswers':
        return (left.maxAnswers - right.maxAnswers) * order
      default:
        return compareString(left[key], right[key]) * order
    }
  })
})

const pagination = usePaginationState(computed(() => sortedForms.value.length))

const rows = computed<StaffDataGridRow[]>(() => {
  const start = (pagination.page.value - 1) * pagination.pageSize.value
  const end = start + pagination.pageSize.value
  return sortedForms.value.slice(start, end).map((staffForm) => ({
    ...staffForm,
    formNumber: String(formOrderMap.value.get(staffForm.id) ?? start + 1)
  }))
})

watch(
  pagination.totalPages,
  (nextTotalPages) => {
    pagination.page.value = Math.min(pagination.page.value, nextTotalPages)
  },
  { immediate: true }
)

function handleSort(nextSortKey: string) {
  if (!isStaffFormSortKey(nextSortKey)) {
    return
  }

  sort.toggleSort(nextSortKey)
  pagination.resetPage()
}

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
    pagination.page.value = Math.min(pagination.page.value, pagination.totalPages.value)
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
</script>

<template>
  <PageLayout fullWidth>
    <DataCard overflow-hidden>
      <AlertMessage v-if="errorMessage" class="mx-6 mt-4">{{ errorMessage }}</AlertMessage>

      <StaffDataGrid
        :rows="rows"
        :columns="columns"
        :page="pagination.page.value"
        :page-size="pagination.pageSize.value"
        :total="sortedForms.length"
        :loading="isBusy"
        :sort-key="sort.sortKey.value"
        :sort-direction="sort.sortDirection.value"
        :show-filter-button="true"
        table-label="申請フォーム一覧"
        empty-message="staff forms は見つかりませんでした。"
        @first="pagination.setFirstPage"
        @prev="pagination.setPrevPage"
        @next="pagination.setNextPage"
        @last="pagination.setLastPage"
        @reload="formsQuery.refetch()"
        @sort="handleSort"
        @update:page-size="pagination.setPageSize"
      >
        <template #toolbar>
          <BaseButton to="/staff/forms/create" variant="primary" size="md" weight="semibold">
            <FaIcon name="plus" fixed-width />
            新規フォーム
          </BaseButton>
          <CsvExportLink :href="exportHref" download>CSVで出力</CsvExportLink>
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
</template>
