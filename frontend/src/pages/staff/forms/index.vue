<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'forms.read'
  }
})

import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import DataCard from '@/components/layouts/DataCard.vue'
import { canEditForms, canReadFormAnswers } from '@/features/staff/access/capabilities'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  buildCopyStaffFormConfirmMessage,
  buildDeleteStaffFormConfirmMessage,
  buildStaffFormsExportUrl,
  extractStaffFormValidationMessage,
  useCopyStaffFormMutation,
  useDeleteStaffFormMutation,
  useStaffFormsQuery,
  type StaffFormSummary
} from '@/features/staff/forms/api'
import { useSessionStore } from '@/features/session/store'
import { formatDateTimeTable } from '@/lib/format/datetime'
import { usePaginationState } from '@/lib/usePaginationState'
import { createSortKeyGuard, useSortState } from '@/lib/useSortState'

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
const detailActionIconClass = computed(() => (canReadAnswers.value ? 'far fa-eye fa-fw' : 'fas fa-cog fa-fw'))

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

function compareString(left: string, right: string) {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

function compareBoolean(left: boolean, right: boolean) {
  if (left === right) {
    return 0
  }
  return left ? 1 : -1
}

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

function resolveTags(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function resolveRowId(row: StaffDataGridRow) {
  return String(row.id ?? '')
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

function resolveDescription(form: StaffFormSummary) {
  if (form.description.trim().length === 0) {
    return '-'
  }
  return form.description
}
</script>

<template>
  <PageLayout class="max-w-full">
    <PageHeader title="申請管理" />

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
          <RouterLink
            to="/staff/forms/create"
            class="rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <i class="fas fa-plus fa-fw" aria-hidden="true" />
            新規フォーム
          </RouterLink>
          <a
            :href="exportHref"
            download
            class="inline-flex items-center gap-2 px-2 text-[1.05rem] text-primary transition hover:text-primary-hover hover:no-underline"
          >
            <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
            CSVで出力
          </a>
        </template>

        <template #actions="{ row }">
          <div class="flex items-center gap-1">
            <RouterLink
              v-if="resolveDetailPath(resolveRowId(row))"
              :to="resolveDetailPath(resolveRowId(row))!"
              class="inline-flex h-8 w-8 items-center justify-center rounded text-body transition hover:bg-primary-light hover:text-primary"
              :title="detailActionTitle"
            >
              <i :class="detailActionIconClass" aria-hidden="true" />
            </RouterLink>
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded text-body transition hover:bg-primary-light hover:text-primary"
              type="button"
              title="複製"
              :disabled="isBusy"
              @click="handleCopyForm(resolveRowId(row))"
            >
              <i class="far fa-copy fa-fw" aria-hidden="true" />
            </button>
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded text-danger transition hover:bg-danger-light"
              type="button"
              title="削除"
              :disabled="isBusy"
              @click="handleDeleteForm(resolveRowId(row))"
            >
              <i class="fas fa-trash fa-fw" aria-hidden="true" />
            </button>
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
          <strong v-if="value === true">はい</strong>
          <span v-else>-</span>
        </template>

        <template #cell-answerableTags="{ value }">
          <div class="flex flex-wrap gap-1">
            <template v-for="tag in resolveTags(value)" :key="tag">
              <span class="inline-flex items-center rounded bg-primary px-2 py-1 text-xs font-semibold text-white">
                {{ tag }}
              </span>
            </template>
            <span v-if="resolveTags(value).length === 0" class="text-muted">全体に公開</span>
          </div>
        </template>

        <template #cell-description="{ row }">
          <span class="whitespace-pre-wrap">{{ resolveDescription(row as StaffFormSummary) }}</span>
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
