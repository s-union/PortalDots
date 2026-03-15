<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: "permissions.read",
  },
});

import { computed, ref } from "vue";
import BackLink from "@/components/ui/BackLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import { canManagePermissions } from "@/features/staff/access/capabilities";
import { useStaffPermissionsQuery } from "@/features/staff/permissions/api";
import { useSessionStore } from "@/features/session/store";
import { calculateTotalPages } from "@/lib/pagination";

const sessionStore = useSessionStore();
const canReadPermissions = computed(() =>
  canManagePermissions(sessionStore.roles, sessionStore.permissions),
);
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const page = ref(1);
const pageSize = 20;
const permissionsQuery = useStaffPermissionsQuery(
  computed(() => canReadPermissions.value && staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize,
  })),
);
const totalPages = computed(() =>
  calculateTotalPages(
    permissionsQuery.data.value?.total ?? 0,
    permissionsQuery.data.value?.pageSize ?? pageSize,
  ),
);

function movePage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), totalPages.value);
}
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/staff"> Staff top へ戻る </BackLink>

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
      <div v-else-if="permissionsQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>
      <div
        v-else-if="(permissionsQuery.data.value?.items.length ?? 0) === 0"
        class="px-6 py-6 text-sm text-muted"
      >
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
              <p class="text-xs text-muted">{{ user.loginIds.join(", ") }}</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="role in user.roles"
                  :key="role"
                  class="rounded-full bg-surface-light px-3 py-1 text-xs text-muted"
                >
                  {{ role }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="permission in user.permissions"
                  :key="permission.name"
                  class="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary"
                >
                  {{ permission.shortName }}
                </span>
                <span
                  v-if="user.permissions.length === 0"
                  class="rounded-full bg-surface-light px-3 py-1 text-xs text-muted"
                >
                  権限なし
                </span>
              </div>
            </div>
            <span class="text-sm text-primary">
              {{ user.isEditable ? "編集へ" : "閲覧のみ" }}
            </span>
          </div>
        </RouterLink>
      </div>

      <template #footer>
        <div
          v-if="permissionsQuery.data.value && permissionsQuery.data.value.total > 0"
          class="flex flex-wrap items-center justify-between gap-4 px-6 py-4 text-sm text-muted"
        >
          <p>
            {{ permissionsQuery.data.value.total }} 件中
            {{ (permissionsQuery.data.value.page - 1) * permissionsQuery.data.value.pageSize + 1 }}
            -
            {{
              Math.min(
                permissionsQuery.data.value.page * permissionsQuery.data.value.pageSize,
                permissionsQuery.data.value.total,
              )
            }}
            件
          </p>
          <div class="flex items-center gap-3">
            <button
              class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="page <= 1"
              type="button"
              @click="movePage(page - 1)"
            >
              前へ
            </button>
            <span>{{ page }} / {{ totalPages }}</span>
            <button
              class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="page >= totalPages"
              type="button"
              @click="movePage(page + 1)"
            >
              次へ
            </button>
          </div>
        </div>
      </template>
    </ListPanel>
  </section>
</template>
