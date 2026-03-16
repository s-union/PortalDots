<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
  },
});

import { computed } from "vue";
import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import {
  canManageCircles,
  canManageParticipationTypes,
  canManagePermissions,
  canManageUsers,
  canReadContactCategories,
  canReadDocuments,
  canReadForms,
  canReadPages,
  canReadPlaces,
  canReadTags,
  canUseMailQueue,
  canUseStaffExports,
  canViewActivityLogs,
} from "@/features/staff/access/capabilities";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();
const pageAdminAvailable = computed(() =>
  canReadPages(sessionStore.roles, sessionStore.permissions),
);
const documentAdminAvailable = computed(() =>
  canReadDocuments(sessionStore.roles, sessionStore.permissions),
);
const tagAdminAvailable = computed(() => canReadTags(sessionStore.roles, sessionStore.permissions));
const placeAdminAvailable = computed(() =>
  canReadPlaces(sessionStore.roles, sessionStore.permissions),
);
const contactCategoryAvailable = computed(() =>
  canReadContactCategories(sessionStore.roles, sessionStore.permissions),
);
const circleAdminAvailable = computed(() =>
  canManageCircles(sessionStore.roles, sessionStore.permissions),
);
const participationTypeAvailable = computed(() =>
  canManageParticipationTypes(sessionStore.roles, sessionStore.permissions),
);
const formsAdminAvailable = computed(() =>
  canReadForms(sessionStore.roles, sessionStore.permissions),
);
const userAdminAvailable = computed(() =>
  canManageUsers(sessionStore.roles, sessionStore.permissions),
);
const permissionAdminAvailable = computed(() =>
  canManagePermissions(sessionStore.roles, sessionStore.permissions),
);
const exportAvailable = computed(() =>
  canUseStaffExports(sessionStore.roles, sessionStore.permissions),
);
const mailQueueAvailable = computed(() =>
  canUseMailQueue(sessionStore.roles, sessionStore.permissions),
);
const activityLogAvailable = computed(() =>
  canViewActivityLogs(sessionStore.roles, sessionStore.permissions),
);

const sections = computed(() => [
  {
    title: "コンテンツ管理",
    links: [
      { to: "/staff/pages", label: "お知らせ管理へ", hidden: !pageAdminAvailable.value },
      {
        to: "/staff/documents",
        label: "配布資料管理へ",
        hidden: !documentAdminAvailable.value,
      },
      { to: "/staff/tags", label: "タグ管理へ", hidden: !tagAdminAvailable.value },
      { to: "/staff/places", label: "場所管理へ", hidden: !placeAdminAvailable.value },
      {
        to: "/staff/contact-categories",
        label: "問い合わせカテゴリ管理へ",
        hidden: !contactCategoryAvailable.value,
      },
    ],
  },
  {
    title: "企画・申請管理",
    links: [
      {
        to: "/staff/circles",
        label: circleAdminAvailable.value ? "企画管理へ" : "企画管理へ",
        disabled: !circleAdminAvailable.value,
        note: "staff.circles.read 系または circle_manager / admin が必要です。",
      },
      {
        to: "/staff/participation-types",
        label: "参加種別管理へ",
        disabled: !participationTypeAvailable.value,
        note: "staff.circles.participation_types または circle_manager / admin が必要です。",
      },
      {
        to: "/staff/forms",
        label: "フォーム管理へ",
        hidden: !formsAdminAvailable.value,
      },
      { to: "/staff/settings", label: "PortalDots 設定へ" },
      { to: "/staff/about", label: "PortalDots について" },
      { to: "/staff/markdown-guide", label: "Markdown ガイド" },
      {
        to: "/staff/exports",
        label: "CSV / ZIP 出力へ",
        hidden: !exportAvailable.value,
      },
      {
        to: "/staff/activity-logs",
        label: "活動ログへ",
        hidden: !activityLogAvailable.value,
      },
    ],
  },
  {
    title: "ユーザー・連絡",
    links: [
      {
        to: "/staff/permissions",
        label: "権限設定へ",
        disabled: !permissionAdminAvailable.value,
        note: "staff.permissions.read 系または admin が必要です。",
      },
      {
        to: "/staff/users",
        label: "ユーザー管理へ",
        disabled: !userAdminAvailable.value,
        note: "staff.users.read 系または user_manager / admin が必要です。",
      },
      { to: "/staff/mails", label: "メールキューへ", hidden: !mailQueueAvailable.value },
    ],
  },
]);
</script>

<template>
  <section class="space-y-6">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h2 class="text-2xl font-semibold text-body">スタッフ作業エリア</h2>
        <p class="mt-2 text-sm text-muted">
          {{ sessionStore.currentCircle?.name ?? "企画未選択" }}
        </p>
      </div>

      <div class="px-6 py-5 text-sm text-muted">
        この画面は staff verify 完了後だけ表示します。staff pages / forms / users / mails
        をここから操作します。
      </div>
    </section>

    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h3 class="text-xl font-semibold text-body">モード切替</h3>
      </div>
      <div class="flex flex-wrap gap-3 px-6 py-5">
        <RouterLink
          class="rounded bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
          to="/circles/select"
        >
          作業する企画を選ぶ
        </RouterLink>
        <RouterLink
          class="rounded border border-border bg-surface px-4 py-3 text-sm text-body transition hover:bg-surface-light"
          to="/workspace"
        >
          一般利用者画面へ戻る
        </RouterLink>
      </div>
    </section>

    <ListPanel
      v-for="section in sections"
      :key="section.title"
      :title="section.title"
      overflow-hidden
    >
      <div class="divide-y divide-border">
        <template v-for="link in section.links" :key="link.to">
          <ListItemLink v-if="link.hidden !== true && link.disabled !== true" :to="link.to">
            <template #title>{{ link.label }}</template>
          </ListItemLink>
          <div v-else-if="link.hidden !== true" class="px-6 py-5 text-sm text-muted">
            <p class="font-semibold">{{ link.label }}</p>
            <p class="mt-2">{{ link.note }}</p>
          </div>
        </template>
      </div>
    </ListPanel>

    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h3 class="text-xl font-semibold text-body">Mock Notes</h3>
      </div>
      <div class="px-6 py-5 text-sm text-muted">
        現在は staff verify のメール送信をモックしています。認証コードは実メールではなく API
        レスポンスと画面で確認する前提です。
      </div>
    </section>
  </section>
</template>
