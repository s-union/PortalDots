<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'permissions.read'
  }
})

import { computed, ref } from 'vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { canManagePermissions } from '@/features/staff/access/capabilities'
import { useStaffPermissionsQuery } from '@/features/staff/permissions/api'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const canReadPermissions = computed(() => canManagePermissions(sessionStore.roles, sessionStore.permissions))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const page = ref(1)
const pageSize = 20
const permissionsQuery = useStaffPermissionsQuery(
  computed(() => canReadPermissions.value && staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize
  }))
)

function movePage(nextPage: number) {
  page.value = nextPage
}
</script>

<template>
  <PageLayout>
    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Staff Permissions</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">スタッフの権限設定</h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        Laravel 側の権限設定一覧に合わせて、スタッフ権限ユーザーごとの permission を管理します。
      </p>
    </SurfaceCard>

    <ListPanel title="権限対象ユーザー" overflow-hidden>
      <div v-if="!canReadPermissions" class="px-6 py-6 text-sm text-muted">
        この画面の閲覧には `staff.permissions.read` 系または `user_manager / admin` が必要です。
      </div>
      <div v-else-if="permissionsQuery.isPending.value" class="px-6 py-6 text-sm text-muted">読み込み中...</div>
      <div v-else-if="(permissionsQuery.data.value?.items.length ?? 0) === 0" class="px-6 py-6 text-sm text-muted">
        権限管理対象のユーザーは見つかりませんでした。
      </div>
      <div v-else class="divide-y divide-border">
        <RouterLink
          v-for="user in permissionsQuery.data.value?.items"
          :key="user.id"
          :to="`/staff/permissions/${user.id}`"
          class="block px-6 py-5 transition hover:bg-surface-light"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <p class="text-sm font-semibold text-body">{{ user.displayName }}</p>
              <p class="text-xs text-muted">{{ user.loginIds.join(', ') }}</p>
              <div class="flex flex-wrap gap-2">
                <StatusBadge v-for="role in user.roles" :key="role" tone="muted">{{ role }}</StatusBadge>
              </div>
              <div class="flex flex-wrap gap-2">
                <StatusBadge v-for="permission in user.permissions" :key="permission.name" tone="primary">
                  {{ permission.shortName }}
                </StatusBadge>
                <StatusBadge v-if="user.permissions.length === 0" tone="muted">権限なし</StatusBadge>
              </div>
            </div>
            <span class="text-sm text-primary">
              {{ user.isEditable ? '編集へ' : '閲覧のみ' }}
            </span>
          </div>
        </RouterLink>
      </div>

      <template #footer>
        <PaginationFooter
          v-if="permissionsQuery.data.value && permissionsQuery.data.value.total > 0"
          :page="page"
          :page-size="permissionsQuery.data.value.pageSize"
          :total="permissionsQuery.data.value.total"
          :bordered="false"
          class="px-6"
          @update:page="movePage"
        />
      </template>
    </ListPanel>
  </PageLayout>
</template>
