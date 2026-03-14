<script setup lang="ts">
import { computed, ref } from "vue";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import SurfaceHeader from "@/components/ui/SurfaceHeader.vue";
import { useStaffStatusQuery } from "@/features/staff/status/api";
import { buildStaffUsersExportUrl, useStaffUsersQuery } from "@/features/staff/users/api";
import { useSessionStore } from "@/features/session/store";
import { calculateTotalPages } from "@/lib/pagination";

const sessionStore = useSessionStore();
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated));
const page = ref(1);
const pageSize = 10;
const usersQuery = useStaffUsersQuery(
  computed(() => staffStatusQuery.data.value?.authorized === true),
  computed(() => ({
    page: page.value,
    pageSize,
  })),
);
const totalPages = computed(() =>
  calculateTotalPages(usersQuery.data.value?.total ?? 0, usersQuery.data.value?.pageSize ?? pageSize),
);
const exportUrl = buildStaffUsersExportUrl();

function movePage(nextPage: number) {
  page.value = Math.min(Math.max(nextPage, 1), totalPages.value);
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div>
        <p class="text-sm text-primary">Staff Users</p>
        <h2 class="mt-3 text-3xl font-semibold text-body">ユーザー管理</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          ログイン ID、本人確認、ロールを staff mode から管理します。
        </p>
      </div>
      <BackLink to="/staff"> Staff top へ戻る </BackLink>
    </header>

    <SurfaceCard overflow-hidden>
      <SurfaceHeader>
        <template #title>ユーザー一覧</template>
        <template #description>
          一覧から本人確認状態を確認し、詳細画面でユーザー情報と権限を更新できます。
        </template>
        <template #actions>
          <a
            :href="exportUrl"
            class="rounded border border-border px-4 py-2 text-sm text-body transition hover:bg-surface-light"
          >
            CSVで出力
          </a>
        </template>
      </SurfaceHeader>

      <div v-if="usersQuery.isPending.value" class="px-5 py-6 text-sm text-muted">
        読み込み中...
      </div>

      <div
        v-else-if="(usersQuery.data.value?.items.length ?? 0) === 0"
        class="px-5 py-6 text-sm text-muted"
      >
        対象ユーザーが見つかりませんでした。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead class="bg-surface-light text-left text-muted-2">
            <tr>
              <th class="px-5 py-3 font-medium">ユーザー</th>
              <th class="px-5 py-3 font-medium">ログイン ID</th>
              <th class="px-5 py-3 font-medium">ロール</th>
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
                {{ user.loginIds.join(", ") }}
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="role in user.roles"
                    :key="role"
                    class="rounded-full bg-primary-light px-3 py-1 text-xs text-primary"
                  >
                    {{ role }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-4">
                <span
                  class="rounded-full px-3 py-1 text-xs"
                  :class="
                    user.isVerified
                      ? 'bg-success-light text-success'
                      : 'bg-surface-light text-muted-2'
                  "
                >
                  {{ user.isVerified ? "確認済み" : "未確認" }}
                </span>
              </td>
              <td class="px-5 py-4 text-right">
                <RouterLink
                  :to="`/staff/users/${user.id}`"
                  class="inline-flex rounded border border-border px-3 py-2 text-sm text-body transition hover:bg-surface-light"
                >
                  編集
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SurfaceCard>

    <footer
      v-if="usersQuery.data.value && usersQuery.data.value.total > 0"
      class="flex flex-wrap items-center justify-between gap-4 rounded border border-border bg-surface px-5 py-4 text-sm text-muted shadow-lv1"
    >
      <p>
        {{ usersQuery.data.value.total }} 件中
        {{ (usersQuery.data.value.page - 1) * usersQuery.data.value.pageSize + 1 }} -
        {{
          Math.min(
            usersQuery.data.value.page * usersQuery.data.value.pageSize,
            usersQuery.data.value.total,
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
    </footer>
  </section>
</template>
