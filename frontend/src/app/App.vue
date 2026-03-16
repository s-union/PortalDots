<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import BottomTabLink from "@/components/ui/BottomTabLink.vue";
import ModeSwitchLink from "@/components/ui/ModeSwitchLink.vue";
import NavMenuLink from "@/components/ui/NavMenuLink.vue";
import PublicFooterLinks from "@/components/ui/PublicFooterLinks.vue";
import { useSessionBootstrapQuery } from "@/features/session/api";
import { useLogoutMutation } from "@/features/auth/api";
import { useSessionStore } from "@/features/session/store";
import { cn } from "@/lib/ui/cn";
import { buttonVariants } from "@/lib/ui/variants";
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

const isDrawerOpen = ref(false);
const isSmallScreen = ref(typeof window !== "undefined" && window.innerWidth <= 1000);

onMounted(() => {
  const mq = window.matchMedia("(max-width: 1000px)");
  mq.addEventListener("change", (e) => {
    isSmallScreen.value = e.matches;
    if (!e.matches) isDrawerOpen.value = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") isDrawerOpen.value = false;
  });
});

// On small screens: slide in/out. On desktop: always visible (no transform).
const drawerTranslateClass = computed(() => {
  if (!isSmallScreen.value) return "";
  return isDrawerOpen.value ? "translate-x-0" : "-translate-x-full";
});

const canAccessStaff = computed(() => hasStaffAccess(sessionStore.roles, sessionStore.permissions));
const canAccessUsers = computed(() => canReadUsers(sessionStore.roles, sessionStore.permissions));
const canAccessCircles = computed(() =>
  canReadCircles(sessionStore.roles, sessionStore.permissions),
);
const canAccessTags = computed(() => canReadTags(sessionStore.roles, sessionStore.permissions));
const canAccessPlaces = computed(() => canReadPlaces(sessionStore.roles, sessionStore.permissions));
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
const canAccessMails = computed(() =>
  canUseMailQueue(sessionStore.roles, sessionStore.permissions),
);
const canAccessActivityLogs = computed(() =>
  canViewActivityLogs(sessionStore.roles, sessionStore.permissions),
);
const isStaffRoute = computed(() => route.path.startsWith("/staff"));
const appModeLabel = computed(() => (isStaffRoute.value ? "スタッフモード" : "一般モード"));
const circleActionLabel = computed(() =>
  sessionStore.currentCircle === null ? "企画を選択" : "企画を切り替え",
);

const generalLinks = computed(() => [
  {
    to: "/",
    label: "ホーム",
    iconClass: "fas fa-home fa-fw",
    active: route.path === "/",
  },
  {
    to: "/workspace/pages",
    label: "お知らせ",
    iconClass: "fas fa-bullhorn fa-fw",
    active: route.path.startsWith("/workspace/pages"),
  },
  {
    to: "/workspace/documents",
    label: "配布資料",
    iconClass: "far fa-file-alt fa-fw",
    active: route.path.startsWith("/workspace/documents"),
  },
  {
    to: "/workspace/forms",
    label: "申請",
    iconClass: "far fa-edit fa-fw",
    active: route.path.startsWith("/workspace/forms"),
    hidden: sessionStore.currentCircle === null,
  },
  {
    to: "/workspace/contact",
    label: "お問い合わせ",
    iconClass: "far fa-envelope fa-fw",
    active: route.path.startsWith("/workspace/contact"),
    hidden: !sessionStore.isAuthenticated,
  },
  {
    to: "/workspace/settings",
    label: "ユーザー設定",
    iconClass: "fas fa-cog fa-fw",
    active: route.path.startsWith("/workspace/settings"),
    hidden: !sessionStore.isAuthenticated,
  },
]);

const mobileTabs = computed(() => [
  {
    to: "/",
    label: "ホーム",
    iconClass: "fas fa-home",
    active: route.path === "/",
  },
  {
    to: "/workspace/pages",
    label: "お知らせ",
    iconClass: "fas fa-bullhorn",
    active: route.path.startsWith("/workspace/pages"),
    showNotifier: false,
  },
  {
    to: "/workspace/documents",
    label: "配布資料",
    iconClass: "far fa-file-alt",
    active: route.path.startsWith("/workspace/documents"),
  },
  {
    to: "/workspace/forms",
    label: "申請",
    iconClass: "far fa-edit",
    active: route.path.startsWith("/workspace/forms"),
    hidden: !sessionStore.isAuthenticated || sessionStore.currentCircle === null,
  },
  {
    to: "/workspace/contact",
    label: "お問い合わせ",
    iconClass: "far fa-envelope",
    active: route.path.startsWith("/workspace/contact"),
    hidden: !sessionStore.isAuthenticated,
  },
]);

const staffLinks = computed(() => [
  {
    to: "/staff",
    label: "スタッフモード ホーム",
    iconClass: "fas fa-home fa-fw",
    active: route.path === "/staff",
  },
  {
    to: "/staff/users",
    label: "ユーザー情報管理",
    iconClass: "far fa-address-book fa-fw",
    active: route.path.startsWith("/staff/users"),
    hidden: !canAccessUsers.value,
  },
  {
    to: "/staff/circles",
    label: "企画情報管理",
    iconClass: "fas fa-star fa-fw",
    active: route.path.startsWith("/staff/circles"),
    hidden: !canAccessCircles.value,
  },
  {
    to: "/staff/tags",
    label: "企画タグ管理",
    iconClass: "fas fa-tags fa-fw",
    active: route.path.startsWith("/staff/tags"),
    hidden: !canAccessTags.value,
  },
  {
    to: "/staff/places",
    label: "場所情報管理",
    iconClass: "fas fa-store fa-fw",
    active: route.path.startsWith("/staff/places"),
    hidden: !canAccessPlaces.value,
  },
  {
    to: "/staff/pages",
    label: "お知らせ管理",
    iconClass: "fas fa-bullhorn fa-fw",
    active: route.path.startsWith("/staff/pages"),
    hidden: !canAccessPages.value,
  },
  {
    to: "/staff/documents",
    label: "配布資料管理",
    iconClass: "far fa-file-alt fa-fw",
    active: route.path.startsWith("/staff/documents"),
    hidden: !canAccessDocuments.value,
  },
  {
    to: "/staff/forms",
    label: "申請管理",
    iconClass: "far fa-edit fa-fw",
    active: route.path.startsWith("/staff/forms"),
    hidden: !canAccessForms.value,
  },
  {
    to: "/staff/contact-categories",
    label: "お問い合わせ受付設定",
    iconClass: "fas fa-at fa-fw",
    active: route.path.startsWith("/staff/contact-categories"),
    hidden: !canAccessContactCategories.value,
  },
  {
    to: "/staff/permissions",
    label: "スタッフの権限設定",
    iconClass: "fas fa-key fa-fw",
    active: route.path.startsWith("/staff/permissions"),
    hidden: !canAccessPermissions.value,
  },
  {
    to: "/staff/settings",
    label: "PortalDots の設定",
    iconClass: "fas fa-cog fa-fw",
    active: route.path.startsWith("/staff/settings"),
  },
  {
    to: "/staff/activity-logs",
    label: "アクティビティログ",
    iconClass: "fas fa-user-edit fa-fw",
    active: route.path.startsWith("/staff/activity-logs"),
    hidden: !canAccessActivityLogs.value,
  },
  {
    to: "/staff/exports",
    label: "CSV / ZIP 出力",
    iconClass: "fas fa-file-export fa-fw",
    active: route.path.startsWith("/staff/exports"),
    hidden: !canAccessExports.value,
  },
  {
    to: "/staff/mails",
    label: "メールキュー",
    iconClass: "far fa-envelope fa-fw",
    active: route.path.startsWith("/staff/mails"),
    hidden: !canAccessMails.value,
  },
]);

const mobileTabsStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(mobileTabs.value.filter((link) => link.hidden !== true).length, 1)}, minmax(0, 1fr))`,
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

const pageTitle = computed(() => {
  if (route.path === "/login") return "ログイン";
  if (route.path === "/register") return "ユーザー登録";
  if (route.path === "/support") return "推奨動作環境";
  if (route.path === "/privacy_policy") return "プライバシーポリシー";
  if (route.path === "/circles/select") return "企画を選択";
  if (route.path === "/circles/new") return "新しい企画を作成";

  const activeLink = [...(isStaffRoute.value ? staffLinks.value : generalLinks.value)].find(
    (link) => link.active,
  );
  return activeLink?.label ?? "PortalDots";
});

async function handleLogout() {
  await logoutMutation.mutateAsync();
  await router.push("/login");
}
</script>

<template>
  <div class="min-h-screen bg-base text-body">
    <!-- Fixed Navbar: height 5rem (h-20), z-[9980] — matches $z-index-navbar -->
    <header
      class="fixed inset-x-0 top-0 z-[9980] flex h-20 items-center gap-4 border-b border-border bg-surface-2 px-6"
    >
      <!-- Hamburger button: visible only at ≤1000px -->
      <button
        class="hidden max-[1000px]:flex items-center justify-center rounded p-2 text-body transition hover:bg-surface-light"
        type="button"
        aria-label="メニューを開く"
        @click="isDrawerOpen = true"
      >
        <span class="text-xl leading-none">☰</span>
      </button>

      <div class="min-w-0">
        <p class="truncate text-lg font-semibold text-body">{{ pageTitle }}</p>
        <p class="mt-1 text-xs text-muted">{{ appModeLabel }}</p>
      </div>
    </header>

    <!-- Drawer Backdrop: visible on small screens when drawer is open -->
    <div
      v-if="isSmallScreen"
      class="fixed inset-0 z-[9989] bg-drawer-backdrop transition-[opacity,visibility] duration-300"
      :class="isDrawerOpen ? 'opacity-100 visible' : 'invisible opacity-0'"
      @click="isDrawerOpen = false"
    />

    <!-- Drawer: fixed 320px (280px at ≤1440px), slides off at ≤1000px — z-[9990] -->
    <aside
      class="fixed left-0 top-0 z-[9990] h-full w-[320px] max-[1440px]:w-[280px] max-[1000px]:w-[320px] max-w-[80vw] overflow-y-auto border-r border-border bg-surface-2 transition-transform duration-300"
      :class="drawerTranslateClass"
    >
      <div class="flex h-full flex-col">
        <!-- Drawer Header: pt accounts for fixed navbar ($navbar-height + $spacing = 6.5rem) -->
        <div class="border-b border-border px-6 pb-6 pt-[6.5rem]">
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

        <!-- Mode Switch -->
        <div class="border-b border-border px-6 py-4">
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
          <ModeSwitchLink v-else-if="!sessionStore.isAuthenticated" to="/login" label="ログイン" />
        </div>

        <!-- Circle Selection (general mode only) -->
        <div
          v-if="sessionStore.isAuthenticated && !isStaffRoute"
          class="border-b border-border px-6 py-4"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">選択中の企画</p>
          <p class="mt-2 text-sm text-body">
            {{ sessionStore.currentCircle?.name ?? "企画未選択" }}
          </p>
          <RouterLink
            :class="
              cn(buttonVariants({ variant: 'secondary', size: 'md', fullWidth: true }), 'mt-3')
            "
            to="/circles/select"
          >
            {{ circleActionLabel }}
          </RouterLink>
        </div>

        <!-- Nav Links -->
        <nav class="flex-1 py-2">
          <NavMenuLink
            v-for="link in isStaffRoute ? staffLinks : generalLinks"
            v-show="link.hidden !== true"
            :key="link.to"
            :to="link.to"
            :label="link.label"
            :icon-class="link.iconClass"
            :active="link.active"
          />
        </nav>

        <!-- Footer: pushed to bottom of scrollable content -->
        <div class="mt-auto border-t border-border px-6 py-6">
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
            :class="
              cn(buttonVariants({ variant: 'secondary', size: 'md', fullWidth: true }), 'mt-3')
            "
            :disabled="logoutMutation.isPending.value"
            type="button"
            @click="handleLogout"
          >
            ログアウト
          </button>
          <div class="mt-5">
            <PublicFooterLinks />
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content: offset by navbar height (pt-20) and drawer width (pl-*) -->
    <main class="pt-20 pl-[320px] max-[1440px]:pl-[280px] max-[1000px]:pl-0">
      <RouterView />
      <footer class="mt-6 border-t border-border px-6 py-6 text-center">
        <PublicFooterLinks app-name="PortalDots" />
      </footer>
    </main>

    <!-- Bottom Tabs: fixed, only visible at ≤1000px — z-[9980] matches $z-index-bottom-tabs -->
    <nav
      v-if="!isStaffRoute"
      class="fixed inset-x-0 bottom-0 z-[9980] hidden border-t border-border bg-surface-2 shadow-[0_-0.1rem_0.8rem_-0.6rem_var(--color-box-shadow)] max-[1000px]:block"
    >
      <div
        class="mx-auto grid w-full max-w-[600px] pb-[env(safe-area-inset-bottom)]"
        :style="mobileTabsStyle"
      >
        <BottomTabLink
          v-for="tab in mobileTabs.filter((link) => link.hidden !== true)"
          :key="tab.to"
          :to="tab.to"
          :label="tab.label"
          :icon-class="tab.iconClass"
          :active="tab.active"
          :show-notifier="tab.showNotifier"
        />
      </div>
    </nav>
  </div>
</template>
