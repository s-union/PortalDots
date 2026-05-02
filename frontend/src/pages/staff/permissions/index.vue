<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/permissions',
  meta: staffPageMeta('permissions.read')
})

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import IconActionButton from '@/components/ui/IconActionButton.vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import StaffDataGrid, { type StaffDataGridColumn, type StaffDataGridRow } from '@/components/staff/StaffDataGrid.vue'
import { canEditPermissions, canManagePermissions } from '@/features/staff/access/capabilities'
import { useStaffPermissionsQuery } from '@/features/staff/permissions/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { resolveRowId } from '@/lib/dataGridHelpers'
import FaIcon from '@/components/ui/FaIcon.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const canReadPermissions = computed(() => canManagePermissions(sessionStore.roles, sessionStore.permissions))
const canUpdatePermissions = computed(() => canEditPermissions(sessionStore.roles, sessionStore.permissions))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const page = ref(1)
const pageSize = ref(25)

const permissionsQuery = useStaffPermissionsQuery(
  computed(() => canReadPermissions.value && staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize: pageSize.value
  }))
)

const columns: StaffDataGridColumn[] = [
  { key: 'userNumber', label: 'ユーザーID', align: 'right', cellClass: 'font-medium text-body' },
  { key: 'displayName', label: '名前', cellClass: 'whitespace-normal min-w-[18rem]' },
  { key: 'permissionSummary', label: '割り当てられた権限', cellClass: 'whitespace-normal min-w-[18rem]' }
]

const rows = computed<StaffDataGridRow[]>(() => {
  const items = permissionsQuery.data.value?.items ?? []
  const start = (page.value - 1) * pageSize.value

  return items.map((user, index) => ({
    id: user.id,
    userNumber: String(start + index + 1),
    displayName: user.displayName,
    loginIds: user.loginIds,
    roles: user.roles,
    permissions: user.permissions,
    permissionSummary:
      user.permissions.length > 0
        ? user.permissions.map((permission) => permission.shortName).join(', ')
        : '利用可能な機能なし',
    isEditable: user.isEditable
  }))
})

const total = computed(() => permissionsQuery.data.value?.total ?? 0)
const resolvedPageSize = computed(() => permissionsQuery.data.value?.pageSize ?? pageSize.value)
const isBusy = computed(() => permissionsQuery.isPending.value || permissionsQuery.isFetching.value)

function resolvePermissionSummary(row: StaffDataGridRow) {
  if (!Array.isArray(row.permissions)) {
    return []
  }

  return row.permissions
    .filter(
      (permission): permission is { shortName: string } =>
        typeof permission === 'object' && permission !== null && 'shortName' in permission
    )
    .map((permission) => permission.shortName)
}

function setFirstPage() {
  page.value = 1
}

function setPrevPage() {
  page.value = Math.max(1, page.value - 1)
}

function setNextPage() {
  const totalPages = Math.max(1, Math.ceil(total.value / resolvedPageSize.value))
  page.value = Math.min(totalPages, page.value + 1)
}

function setLastPage() {
  page.value = Math.max(1, Math.ceil(total.value / resolvedPageSize.value))
}

function handlePageSize(nextPageSize: number) {
  pageSize.value = nextPageSize
  page.value = 1
}

function navigateToEdit(userId: string) {
  router.push(`/staff/permissions/${encodeURIComponent(userId)}`)
}
</script>

<template>
  <PageLayout>
    <DataCard>
      <SurfaceCardBand>
        <h2 class="text-lg font-semibold text-body">スタッフの権限設定</h2>
      </SurfaceCardBand>

      <div v-if="!canReadPermissions" class="px-6 py-6 text-sm text-muted">
        この画面の閲覧には `staff.permissions.read` 系または `admin` が必要です。
      </div>

      <StaffDataGrid
        v-else
        :rows="rows"
        :columns="columns"
        :page="page"
        :page-size="resolvedPageSize"
        :total="total"
        :loading="isBusy"
        :show-filter-button="true"
        table-label="スタッフ権限一覧"
        empty-message="権限管理対象のユーザーは見つかりませんでした。"
        @first="setFirstPage"
        @prev="setPrevPage"
        @next="setNextPage"
        @last="setLastPage"
        @reload="permissionsQuery.refetch()"
        @update:page-size="handlePageSize"
      >
        <template #actions="{ row }">
          <IconActionButton
            v-if="row.isEditable || canUpdatePermissions"
            title="編集"
            @click="navigateToEdit(resolveRowId(row))"
          >
            <FaIcon name="pencil-alt" fixed-width />
          </IconActionButton>
          <span v-else class="inline-flex h-8 w-8 items-center justify-center text-muted" title="閲覧のみ">
            <FaIcon name="lock" fixed-width />
          </span>
        </template>

        <template #cell-displayName="{ row }">
          <div class="space-y-1">
            <div class="font-medium text-body">{{ row.displayName }}</div>
            <div class="text-xs text-muted">{{ Array.isArray(row.loginIds) ? row.loginIds.join(', ') : '-' }}</div>
          </div>
        </template>

        <template #cell-permissionSummary="{ row }">
          <div class="space-y-1">
            <div class="text-body">
              {{
                resolvePermissionSummary(row).length > 0
                  ? resolvePermissionSummary(row).join(', ')
                  : '利用可能な機能なし'
              }}
            </div>
            <div v-if="Array.isArray(row.roles) && row.roles.length > 0" class="text-xs text-muted">
              {{ row.roles.join(', ') }}
            </div>
          </div>
        </template>
      </StaffDataGrid>
    </DataCard>
  </PageLayout>
</template>
