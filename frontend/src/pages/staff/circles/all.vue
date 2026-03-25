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
import { useStaffPlacesQuery } from '@/features/staff/masters/places'
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
const placesQuery = useStaffPlacesQuery(enabled)
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
    key: 'nameYomi',
    label: '企画名(よみ)',
    sortable: true
  },
  {
    key: 'groupName',
    label: '企画を出店する団体の名称',
    sortable: true
  },
  {
    key: 'groupNameYomi',
    label: '企画を出店する団体の名称(よみ)',
    sortable: true
  },
  {
    key: 'tags',
    label: 'タグ'
  },
  {
    key: 'notes',
    label: 'スタッフ用メモ',
    sortable: true
  },
  {
    key: 'submittedAt',
    label: '参加登録提出日時',
    sortable: true
  },
  {
    key: 'status',
    label: '受理状況',
    sortable: true
  },
  {
    key: 'places',
    label: '使用場所'
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
</script>

<template>
  <PageLayout>
    <PageHeader title="企画情報管理 - 全企画一覧">
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
            to="/staff/circles"
          >
            企画管理トップへ
          </RouterLink>
          <RouterLink
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
            to="/staff/circles/participation_types"
          >
            参加種別管理
          </RouterLink>
        </div>
      </template>
    </PageHeader>

    <DataCard title="企画一覧" overflow-hidden>
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
  </PageLayout>
</template>
