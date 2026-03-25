<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.read'
  }
})

import { computed, ref } from 'vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { canDeleteCircles, canEditCircles, canSendCircleEmails } from '@/features/staff/access/capabilities'
import {
  buildStaffCirclesExportUrl,
  extractStaffCircleValidationMessage,
  useAllStaffCirclesQuery,
  useCreateStaffCircleMutation,
  useDeleteStaffCircleMutation,
  useStaffCircleForm,
  useStaffCirclesQuery
} from '@/features/staff/circles/api'
import { useStaffParticipationTypesQuery } from '@/features/staff/participation-types/api'
import { useSessionStore } from '@/features/session/store'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const page = ref(1)
const pageSize = ref(25)
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const circlesQuery = useStaffCirclesQuery(
  enabled,
  computed(() => ({
    page: page.value,
    pageSize: pageSize.value
  }))
)
const allCirclesQuery = useAllStaffCirclesQuery(enabled)
const participationTypesQuery = useStaffParticipationTypesQuery(enabled)
const createCircleMutation = useCreateStaffCircleMutation()
const deletingCircleId = ref('')
const deleteCircleMutation = useDeleteStaffCircleMutation(computed(() => deletingCircleId.value))
const form = useStaffCircleForm()
const errorMessage = ref('')
const exportUrl = buildStaffCirclesExportUrl()
const sortKey = ref<StaffCircleSortKey>('id')
const sortDirection = ref<'asc' | 'desc'>('asc')

const canEdit = computed(() => canEditCircles(sessionStore.roles, sessionStore.permissions))
const canDelete = computed(() => canDeleteCircles(sessionStore.roles, sessionStore.permissions))
const canSendEmail = computed(() => canSendCircleEmails(sessionStore.roles, sessionStore.permissions))

const columns: StaffDataGridColumn[] = [
  {
    key: 'id',
    label: '企画ID',
    sortable: true
  },
  {
    key: 'participationTypeName',
    label: '参加種別',
    sortable: true
  },
  {
    key: 'name',
    label: '企画名',
    sortable: true
  },
  {
    key: 'groupName',
    label: '企画を出店する団体の名称',
    sortable: true
  }
]

const rows = computed<StaffCircleRow[]>(() => circlesQuery.data.value?.items ?? [])
const sortedRows = computed<StaffCircleRow[]>(() => {
  const cloned = [...rows.value]
  const direction = sortDirection.value === 'asc' ? 1 : -1
  const key = sortKey.value

  cloned.sort((left, right) => {
    const leftValue = String(left[key]).toLowerCase()
    const rightValue = String(right[key]).toLowerCase()

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
const gridRows = computed<StaffDataGridRow[]>(() => sortedRows.value.map((circle) => ({ ...circle })))

async function handleCreateCircle() {
  errorMessage.value = ''

  try {
    await createCircleMutation.mutateAsync({
      name: form.value.name,
      groupName: form.value.groupName,
      participationTypeId: form.value.participationTypeId
    })
    form.value = {
      name: '',
      groupName: '',
      participationTypeId: ''
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
  const total = circlesQuery.data.value?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize.value))
  page.value = Math.min(totalPages, page.value + 1)
}

function handleLastPage() {
  const total = circlesQuery.data.value?.total ?? 0
  page.value = Math.max(1, Math.ceil(total / pageSize.value))
}

async function handleReload() {
  if (typeof circlesQuery.refetch === 'function') {
    await circlesQuery.refetch()
  }
}

function handlePageSizeChange(nextSize: number) {
  pageSize.value = nextSize
  page.value = 1
}

async function handleDeleteCircle(circleId: string, circleName: string) {
  if (typeof window !== 'undefined' && !window.confirm(`企画「${circleName}」を削除しますか？`)) {
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

interface StaffCircleRow {
  id: string
  name: string
  groupName: string
  participationTypeName: string
}

const staffCircleSortKeys = ['id', 'participationTypeName', 'name', 'groupName'] as const
type StaffCircleSortKey = (typeof staffCircleSortKeys)[number]

function isStaffCircleSortKey(value: string): value is StaffCircleSortKey {
  return (staffCircleSortKeys as readonly string[]).includes(value)
}
</script>

<template>
  <PageLayout>
    <PageHeader
      eyebrow="Staff Circles"
      title="企画管理"
      description="企画名、企画グループ、参加種別、関連メール送信の導線を staff mode で管理します。"
    >
      <template #actions>
        <div class="flex flex-wrap gap-3">
          <a
            :href="exportUrl"
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          >
            CSVで出力
          </a>
          <RouterLink
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
            to="/staff/participation-types"
          >
            参加種別管理
          </RouterLink>
          <RouterLink
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
            to="/staff"
          >
            Staff top へ戻る
          </RouterLink>
        </div>
      </template>
    </PageHeader>

    <DataCard title="企画一覧" description="ページ送り付きの一覧に加え、全件数も同時に確認できます。" overflow-hidden>
      <StaffDataGrid
        :rows="gridRows"
        :columns="columns"
        :page="page"
        :page-size="pageSize"
        :total="circlesQuery.data.value?.total ?? 0"
        :loading="circlesQuery.isPending.value"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        empty-message="企画はまだありません。"
        table-label="staff circles"
        @first="handleFirstPage"
        @prev="handlePrevPage"
        @next="handleNextPage"
        @last="handleLastPage"
        @reload="handleReload"
        @sort="handleSort"
        @update:page-size="handlePageSizeChange"
      >
        <template #toolbar>
          <div class="grid gap-2 text-sm text-muted sm:grid-cols-2">
            <p>現在のページ件数: {{ circlesQuery.data.value?.items.length ?? 0 }}</p>
            <p>全企画数: {{ allCirclesQuery.data.value?.length ?? 0 }}</p>
          </div>
        </template>

        <template #actions="{ row }">
          <div class="flex items-center gap-2">
            <RouterLink
              v-if="canEdit"
              :to="`/staff/circles/${String(row.id)}`"
              class="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-body transition hover:bg-surface-light"
              title="編集"
            >
              <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
            </RouterLink>
            <RouterLink
              v-if="canSendEmail"
              :to="`/staff/circles/${String(row.id)}`"
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
          <RouterLink :to="`/staff/circles/${String(row.id)}`" class="font-medium text-primary hover:underline">
            {{ String(value) }}
          </RouterLink>
        </template>

        <template #cell-participationTypeName="{ value }">
          <StatusBadge tone="primary" size="sm">{{ String(value) }}</StatusBadge>
        </template>
      </StaffDataGrid>
    </DataCard>

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
            <span class="font-medium">企画グループ名</span>
            <input
              v-model="form.groupName"
              class="rounded border border-border bg-form-control px-4 py-3 text-body outline-none transition focus:border-primary focus:focus-ring-primary"
              name="groupName"
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
  </PageLayout>
</template>
