<script setup lang="ts">
definePage({
  path: '/staff/circles/participation_types/:typeId',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.participationTypes'
  }
})

import { computed, ref } from 'vue'
import BackLink from '@/components/ui/BackLink.vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useRoute } from 'vue-router'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  buildStaffParticipationTypeCirclesExportUrl,
  type StaffParticipationTypeCircle,
  useStaffParticipationTypeCirclesQuery,
  useStaffParticipationTypeDetailQuery
} from '@/features/staff/participation-types/api'
import { buildStaffParticipationTypeTabs } from '@/features/ui/tabStrip'

const route = useRoute('/staff/circles/participation_types/[typeId]')
const typeId = computed(() => String(route.params.typeId ?? ''))
const { enabled } = useAuthorizedStaffContext({ capability: 'circles.participationTypes' })
const detailQuery = useStaffParticipationTypeDetailQuery(typeId, enabled)

const circlesPage = ref(1)
const circlesPageSize = ref(25)
const circlesQuery = useStaffParticipationTypeCirclesQuery(typeId, enabled, circlesPage, circlesPageSize)

const circlesSortKey = ref<StaffParticipationTypeCirclesSortKey>('id')
const circlesSortDirection = ref<'asc' | 'desc'>('asc')

const circlesExportUrl = computed(() => buildStaffParticipationTypeCirclesExportUrl(typeId.value))

const uploadsUrl = computed(() => {
  const formId = detailQuery.data.value?.form.id
  if (!formId) {
    return undefined
  }
  return `/staff/forms/${encodeURIComponent(formId)}/answers/uploads`
})

const participationTypeTabs = computed(() =>
  buildStaffParticipationTypeTabs(typeId.value, 'circles', detailQuery.data.value?.form)
)

const circlesColumns: StaffDataGridColumn[] = [
  { key: 'id', label: '企画ID', sortable: true },
  { key: 'name', label: '企画名', sortable: true },
  { key: 'groupName', label: '企画グループ名', sortable: true },
  { key: 'status', label: '受理状況', sortable: true },
  { key: 'places', label: '使用場所' }
]

type StaffParticipationTypeCirclesSortKey = 'id' | 'name' | 'groupName' | 'status'

const circlesSortKeys = ['id', 'name', 'groupName', 'status'] as const

const circlesRows = computed(() => circlesQuery.data.value?.items ?? [])

const circlesGridRows = computed<StaffDataGridRow[]>(() =>
  sortCirclesRows(circlesRows.value, circlesSortKey.value, circlesSortDirection.value).map((circle) => ({
    id: circle.id,
    name: circle.name,
    groupName: circle.groupName,
    status: circle.status,
    places: circle.places
  }))
)

function handleCirclesSort(nextKey: string) {
  if (!isStaffParticipationTypeCirclesSortKey(nextKey)) {
    return
  }

  if (circlesSortKey.value === nextKey) {
    circlesSortDirection.value = circlesSortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  circlesSortKey.value = nextKey
  circlesSortDirection.value = 'asc'
}

function handleCirclesFirstPage() {
  circlesPage.value = 1
}

function handleCirclesPrevPage() {
  circlesPage.value = Math.max(1, circlesPage.value - 1)
}

function handleCirclesNextPage() {
  const total = circlesQuery.data.value?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / circlesPageSize.value))
  circlesPage.value = Math.min(totalPages, circlesPage.value + 1)
}

function handleCirclesLastPage() {
  const total = circlesQuery.data.value?.total ?? 0
  circlesPage.value = Math.max(1, Math.ceil(total / circlesPageSize.value))
}

function handleCirclesPageSizeChange(nextSize: number) {
  circlesPageSize.value = nextSize
  circlesPage.value = 1
}

async function handleCirclesReload() {
  if (typeof circlesQuery.refetch === 'function') {
    await circlesQuery.refetch()
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

function isStaffParticipationTypeCirclesSortKey(value: string): value is StaffParticipationTypeCirclesSortKey {
  return (circlesSortKeys as readonly string[]).includes(value)
}

function sortCirclesRows(
  rows: StaffParticipationTypeCircle[],
  key: StaffParticipationTypeCirclesSortKey,
  direction: 'asc' | 'desc'
) {
  const sorted = [...rows]
  const order = direction === 'asc' ? 1 : -1

  sorted.sort((left, right) => {
    const leftValue = resolveCircleSortValue(left, key)
    const rightValue = resolveCircleSortValue(right, key)

    if (leftValue < rightValue) {
      return -order
    }
    if (leftValue > rightValue) {
      return order
    }
    return 0
  })

  return sorted
}

function resolveCircleSortValue(circle: StaffParticipationTypeCircle, key: StaffParticipationTypeCirclesSortKey) {
  if (key === 'id') {
    return circle.id.toLowerCase()
  }
  if (key === 'name') {
    return circle.name.toLowerCase()
  }
  if (key === 'groupName') {
    return circle.groupName.toLowerCase()
  }
  return circle.status.toLowerCase()
}
</script>

<template>
  <PageLayout class="max-w-full">
    <BackLink to="/staff/circles/participation_types"> 参加種別管理へ戻る </BackLink>

    <TabStrip v-if="detailQuery.data.value" :tabs="participationTypeTabs" />

    <div v-if="detailQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <template v-else-if="detailQuery.data.value">
      <SurfaceCard tag="header">
        <p class="text-sm text-primary">Participation Type Circles</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">{{ detailQuery.data.value.name }}</h2>
        <p class="mt-3 text-sm text-muted">{{ detailQuery.data.value.description || '説明は未設定です。' }}</p>
      </SurfaceCard>

      <DataCard title="企画一覧" description="この参加種別に登録された企画を確認できます。" overflow-hidden>
        <template #actions>
          <div class="flex flex-wrap gap-2">
            <a
              :href="circlesExportUrl"
              class="rounded border border-border bg-surface px-3 py-2 text-xs text-body transition hover:bg-surface-light"
            >
              CSVで出力
            </a>
            <RouterLink
              v-if="uploadsUrl"
              :to="uploadsUrl"
              class="rounded border border-border bg-surface px-3 py-2 text-xs text-body transition hover:bg-surface-light"
            >
              ファイルを一括ダウンロード
            </RouterLink>
          </div>
        </template>

        <StaffDataGrid
          :rows="circlesGridRows"
          :columns="circlesColumns"
          :page="circlesPage"
          :page-size="circlesPageSize"
          :total="circlesQuery.data.value?.total ?? 0"
          :loading="circlesQuery.isPending.value"
          :sort-key="circlesSortKey"
          :sort-direction="circlesSortDirection"
          empty-message="この参加種別に紐づく企画はありません。"
          table-label="staff participation type circles"
          @first="handleCirclesFirstPage"
          @prev="handleCirclesPrevPage"
          @next="handleCirclesNextPage"
          @last="handleCirclesLastPage"
          @reload="handleCirclesReload"
          @sort="handleCirclesSort"
          @update:page-size="handleCirclesPageSizeChange"
        >
          <template #actions="{ row }">
            <RouterLink
              :to="`/staff/circles/${encodeURIComponent(String(row.id))}`"
              class="inline-flex h-8 items-center justify-center rounded border border-border bg-surface px-2 text-body transition hover:bg-surface-light"
            >
              企画を開く
            </RouterLink>
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
              <span v-if="Array.isArray(value) && value.length === 0" class="text-muted">-</span>
            </div>
          </template>
        </StaffDataGrid>
      </DataCard>
    </template>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      参加種別を取得できませんでした。
    </div>
  </PageLayout>
</template>
