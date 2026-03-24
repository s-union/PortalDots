<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'users.read'
  }
})

import { computed, ref } from 'vue'
import DataCard from '@/components/layouts/DataCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import PaginationFooter from '@/components/ui/PaginationFooter.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { buildStaffUsersExportUrl, useStaffUsersQuery } from '@/features/staff/users/api'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const page = ref(1)
const pageSize = 10
const usersQuery = useStaffUsersQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize
  }))
)
const exportUrl = buildStaffUsersExportUrl()

function movePage(nextPage: number) {
  page.value = nextPage
}
</script>

<template>
  <PageLayout>
    <DataCard title="ユーザー情報管理" overflow-hidden>
      <template #toolbar>
        <a
          :href="exportUrl"
          class="inline-flex items-center gap-2 rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light hover:no-underline"
        >
          <i class="fas fa-file-csv fa-fw" aria-hidden="true" />
          CSVで出力
        </a>
      </template>

      <div v-if="usersQuery.isPending.value" class="px-5 py-6 text-sm text-muted">読み込み中...</div>

      <div v-else-if="(usersQuery.data.value?.items.length ?? 0) === 0" class="px-5 py-6 text-sm text-muted">
        対象ユーザーが見つかりませんでした。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead class="bg-surface-light text-left text-muted-2">
            <tr>
              <th class="px-5 py-3 font-medium">ユーザー</th>
              <th class="px-5 py-3 font-medium">ログイン ID</th>
              <th class="px-5 py-3 font-medium">ユーザー種別</th>
              <th class="px-5 py-3 font-medium">本人確認</th>
              <th class="px-5 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="user in usersQuery.data.value?.items" :key="user.id" class="align-top">
              <td class="px-5 py-4">
                <p class="font-medium text-body">{{ user.displayName }}</p>
                <p class="mt-1 text-xs text-muted">ユーザーID: {{ user.id }}</p>
              </td>
              <td class="px-5 py-4 text-body">
                {{ user.loginIds.join(', ') }}
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-wrap gap-2">
                  <StatusBadge v-for="role in user.roles" :key="role" tone="primary" size="sm">
                    {{ role }}
                  </StatusBadge>
                </div>
              </td>
              <td class="px-5 py-4">
                <StatusBadge :tone="user.isVerified ? 'success' : 'danger'" size="sm">
                  {{ user.isVerified ? '確認済み' : '未確認' }}
                </StatusBadge>
              </td>
              <td class="px-5 py-4 text-right">
                <RouterLink
                  :to="`/staff/users/${user.id}`"
                  class="inline-flex rounded border border-border px-3 py-2 text-sm text-body transition hover:bg-surface-light"
                >
                  <i class="fas fa-pencil-alt fa-fw" aria-hidden="true" />
                  編集
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <PaginationFooter
          v-if="usersQuery.data.value && usersQuery.data.value.total > 0"
          :page="page"
          :page-size="usersQuery.data.value.pageSize"
          :total="usersQuery.data.value.total"
          :bordered="false"
          @update:page="movePage"
        />
      </template>
    </DataCard>
  </PageLayout>
</template>
