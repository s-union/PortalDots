<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import BottomTabLink from "@/components/ui/BottomTabLink.vue";
import ModeSwitchLink from "@/components/ui/ModeSwitchLink.vue";
import NavMenuLink from "@/components/ui/NavMenuLink.vue";
import { useSessionBootstrapQuery } from "@/features/session/api";
import { useLogoutMutation } from "@/features/auth/api";
import { useSessionStore } from "@/features/session/store";
import {
  canReadCircles,
  canReadContactCategories,
  canReadDocuments,
  canReadForms,
  canReadPages,
  canReadPermissions,
  canReadPlaces,
  canReadTags,
  canReadUsers,
  canUseMailQueue,
  canUseStaffExports,
  canViewActivityLogs,
  hasStaffAccess,
} from "@/features/staff/access/capabilities";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const bootstrapQuery = useSessionBootstrapQuery();
const logoutMutation = useLogoutMutation();

const canAccessStaff = computed(() =>
  hasStaffAccess(sessionStore.roles, sessionStore.permissions),
);
const canAccessUsers = computed(() => canReadUsers(sessionStore.roles, sessionStore.permissions));
const canAccessCircles = computed(() =>
  canReadCircles(sessionStore.roles, sessionStore.permissions),
);
const canAccessTags = computed(() => canReadTags(sessionStore.roles, sessionStore.permissions));
const canAccessPlaces = computed(() =>
  canReadPlaces(sessionStore.roles, sessionStore.permissions),
);
const canAccessPages = computed(() => canReadPages(sessionStore.roles, sessionStore.permissions));
const canAccessDocuments = computed(() =>
  canReadDocuments(sessionStore.roles, sessionStore.permissions),
);
const canAccessForms = computed(() => canReadForms(sessionStore.roles, sessionStore.permissions));
const canAccessContactCategories = computed(() =>
  canReadContactCategories(sessionStore.roles, sessionStore.permissions),
);
const canAccessPermissions = computed(() =>
  canReadPermissions(sessionStore.roles, sessionStore.permissions),
);
const canAccessExports = computed(() =>
  canUseStaffExports(sessionStore.roles, sessionStore.permissions),
);
const canAccessMails = computed(() => canUseMailQueue(sessionStore.roles, sessionStore.permissions));
const canAccessActivityLogs = computed(() =>
  canViewActivityLogs(sessionStore.roles, sessionStore.permissions),
);
const isStaffRoute = computed(() => route.path.startsWith("/staff"));
const appModeLabel = computed(() => (isStaffRoute.value ? "スタッフモード" : "一般モード"));
const circleActionLabel = computed(() =>
  sessionStore.currentCircle === null ? "企画を選択" : "企画を切り替え",
);

const generalLinks = computed(() => [
  { to: "/", label: "ホーム", icon: "H", active: route.path === "/" },
  {
    to: "/workspace/pages",
    label: "お知らせ",
    icon: "P",
    active: route.path.startsWith("/workspace/pages"),
  },
  {
    to: "/workspace/documents",
    label: "配布資料",
    icon: "D",
    active: route.path.startsWith("/workspace/documents"),
  },
  {
    to: "/workspace/forms",
    label: "申請",
    icon: "F",
    active: route.path.startsWith("/workspace/forms"),
    hidden: sessionStore.currentCircle === null,
  },
  {
    to: "/workspace/contact",
    label: "お問い合わせ",
    icon: "?",
    active: route.path.startsWith("/workspace/contact"),
    hidden: !sessionStore.isAuthenticated || sessionStore.currentCircle === null,
  },
  {
    to: "/workspace/settings",
    label: "ユーザー設定",
    icon: "S",
    active: route.path.startsWith("/workspace/settings"),
    hidden: !sessionStore.isAuthenticated,
  },
]);

const staffLinks = computed(() => [
  { to: "/staff", label: "スタッフモード ホーム", icon: "H", active: route.path === "/staff" },
  {
    to: "/staff/users",
    label: "ユーザー情報管理",
    icon: "U",
    active: route.path.startsWith("/staff/users"),
    hidden: !canAccessUsers.value,
  },
  {
    to: "/staff/circles",
    label: "企画情報管理",
    icon: "C",
    active: route.path.startsWith("/staff/circles"),
    hidden: !canAccessCircles.value,
  },
  {
    to: "/staff/tags",
    label: "企画タグ管理",
    icon: "T",
    active: route.path.startsWith("/staff/tags"),
    hidden: !canAccessTags.value,
  },
  {
    to: "/staff/places",
    label: "場所情報管理",
    icon: "L",
    active: route.path.startsWith("/staff/places"),
    hidden: !canAccessPlaces.value,
  },
  {
    to: "/staff/pages",
    label: "お知らせ管理",
    icon: "P",
    active: route.path.startsWith("/staff/pages"),
    hidden: !canAccessPages.value,
  },
  {
    to: "/staff/documents",
    label: "配布資料管理",
    icon: "D",
    active: route.path.startsWith("/staff/documents"),
    hidden: !canAccessDocuments.value,
  },
  {
    to: "/staff/forms",
    label: "申請管理",
    icon: "F",
    active: route.path.startsWith("/staff/forms"),
    hidden: !canAccessForms.value,
  },
  {
    to: "/staff/contact-categories",
    label: "お問い合わせ受付設定",
    icon: "@",
    active: route.path.startsWith("/staff/contact-categories"),
    hidden: !canAccessContactCategories.value,
  },
  {
    to: "/staff/permissions",
    label: "スタッフの権限設定",
    icon: "R",
    active: route.path.startsWith("/staff/permissions"),
    hidden: !canAccessPermissions.value,
  },
  {
    to: "/staff/settings",
    label: "PortalDots の設定",
    icon: "S",
    active: route.path.startsWith("/staff/settings"),
  },
  {
    to: "/staff/activity-logs",
    label: "アクティビティログ",
    icon: "A",
    active: route.path.startsWith("/staff/activity-logs"),
    hidden: !canAccessActivityLogs.value,
  },
  {
    to: "/staff/exports",
    label: "CSV / ZIP 出力",
    icon: "E",
    active: route.path.startsWith("/staff/exports"),
    hidden: !canAccessExports.value,
  },
  {
    to: "/staff/mails",
    label: "メールキュー",
    icon: "M",
    active: route.path.startsWith("/staff/mails"),
    hidden: !canAccessMails.value,
  },
]);

const mobileTabs = computed(() =>
  generalLinks.value.filter((link) => link.hidden !== true).slice(0, 4),
);
const mobileTabsStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(mobileTabs.value.length, 1)}, minmax(0, 1fr))`,
}));
const statusBadges = computed(() => {
  if (!sessionStore.isAuthenticated) {
    return [];
  }

  const badges = ["ログイン中"];
  if (sessionStore.roles.includes("admin")) {
    badges.push("管理者");
  } else if (canAccessStaff.value) {
    badges.push("スタッフ");
  }
  return badges;
});

const authLabel = computed(() => {
  if (bootstrapQuery.isLoading.value) {
    return "loading";
  }
  if (!sessionStore.isAuthenticated) {
    return "ログインしていません";
  }
  return `${sessionStore.user?.displayName ?? "unknown"}としてログイン中`;
});

async function handleLogout() {
  await logoutMutation.mutateAsync();
  await router.push("/login");
}
</script>

<template>
  <div class="min-h-screen bg-base text-body">
    <header class="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div>
          <p class="text-lg font-semibold text-body">PortalDots</p>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <p class="text-xs text-muted">{{ appModeLabel }}</p>
            <span
              v-if="sessionStore.currentCircle && !isStaffRoute"
              class="rounded-full bg-surface-light px-2 py-0.5 text-[10px] font-semibold text-muted"
            >
              {{ sessionStore.currentCircle.name }}
            </span>
            <span
              v-for="badge in statusBadges"
              :key="badge"
              class="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary"
            >
              {{ badge }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <p class="hidden text-sm text-muted md:block">{{ authLabel }}</p>
          <RouterLink
            v-if="sessionStore.isAuthenticated && !isStaffRoute"
            class="hidden rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light md:inline-flex"
            to="/circles/select"
          >
            {{ circleActionLabel }}
          </RouterLink>
          <ModeSwitchLink
            v-if="sessionStore.isAuthenticated && canAccessStaff && !isStaffRoute"
            to="/staff"
            label="スタッフモードへ"
          />
          <ModeSwitchLink
            v-if="sessionStore.isAuthenticated && canAccessStaff && isStaffRoute"
            to="/"
            label="一般モードへ"
          />
          <ModeSwitchLink v-if="!sessionStore.isAuthenticated" to="/login" label="ログイン" />
          <button
            v-if="sessionStore.isAuthenticated"
            class="rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:opacity-60"
            :disabled="logoutMutation.isPending.value"
            type="button"
            @click="handleLogout"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>

    <div class="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
      <aside class="hidden w-72 shrink-0 md:block">
        <div class="overflow-hidden rounded border border-border bg-surface shadow-lv1">
          <div class="border-b border-border px-5 py-5">
            <p class="text-lg font-semibold text-body">PortalDots</p>
            <div v-if="isStaffRoute" class="mt-2 flex items-center gap-2">
              <span
                class="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary"
              >
                {{ appModeLabel }}
              </span>
            </div>
            <p class="mt-3 text-sm text-muted">
              {{
                isStaffRoute
                  ? authLabel
                  : `現在の企画: ${sessionStore.currentCircle?.name ?? "未選択"}`
              }}
            </p>
          </div>

          <div class="border-b border-border px-5 py-4">
            <ModeSwitchLink
              v-if="sessionStore.isAuthenticated && canAccessStaff && !isStaffRoute"
              to="/staff"
              label="スタッフモードへ"
            />
            <ModeSwitchLink
              v-else-if="sessionStore.isAuthenticated && canAccessStaff && isStaffRoute"
              to="/"
              label="一般モードへ"
            />
            <ModeSwitchLink
              v-else-if="!sessionStore.isAuthenticated"
              to="/login"
              label="ログイン"
            />
          </div>

          <div
            v-if="sessionStore.isAuthenticated && !isStaffRoute"
            class="border-b border-border px-5 py-4"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">選択中の企画</p>
            <p class="mt-2 text-sm text-body">
              {{ sessionStore.currentCircle?.name ?? "企画未選択" }}
            </p>
            <RouterLink
              class="mt-3 inline-flex w-full items-center justify-center rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              to="/circles/select"
            >
              {{ circleActionLabel }}
            </RouterLink>
          </div>

          <nav class="grid">
            <NavMenuLink
              v-for="link in isStaffRoute ? staffLinks : generalLinks"
              v-show="link.hidden !== true"
              :key="link.to"
              :to="link.to"
              :label="link.label"
              :icon="link.icon"
              :active="link.active"
            />
          </nav>

          <div class="border-t border-border px-5 py-4">
            <p v-if="isStaffRoute" class="text-sm text-muted">{{ authLabel }}</p>
            <div v-if="statusBadges.length > 0" class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="badge in statusBadges"
                :key="`drawer-${badge}`"
                class="rounded-full bg-primary-light px-2 py-1 text-[10px] font-semibold text-primary"
              >
                {{ badge }}
              </span>
            </div>
            <button
              v-if="sessionStore.isAuthenticated"
              class="mt-3 inline-flex w-full items-center justify-center rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light disabled:opacity-60"
              :disabled="logoutMutation.isPending.value"
              type="button"
              @click="handleLogout"
            >
              ログアウト
            </button>
          </div>
        </div>
      </aside>

      <main class="min-w-0 flex-1 pb-20 md:pb-0">
        <RouterView />
      </main>
    </div>

    <nav
      v-if="!isStaffRoute"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface md:hidden"
    >
      <div class="grid" :style="mobileTabsStyle">
        <BottomTabLink
          v-for="tab in mobileTabs"
          :key="tab.to"
          :to="tab.to"
          :label="tab.label"
          :icon="tab.icon"
          :active="tab.active"
        />
      </div>
    </nav>
  </div>
</template>
