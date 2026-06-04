<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { cn } from '@/lib/ui/cn'
import { useAppShell } from '@/app/composables/useAppShell'

const AppDrawer = defineAsyncComponent(() => import('@/components/shell/AppDrawer.vue'))
const BottomTabLink = defineAsyncComponent(() => import('@/components/ui/BottomTabLink.vue'))
const PublicFooterLinks = defineAsyncComponent(() => import('@/components/ui/PublicFooterLinks.vue'))

const {
  appModeLabel,
  appName,
  authLabel,
  closeDrawer,
  drawerLinks,
  drawerTranslateClass,
  handleLogout,
  hasDrawer,
  isDemoMode,
  isDrawerOpen,
  isSmallScreen,
  isStaffRoute,
  logoutMutation,
  mainContentClass,
  mobileTabs,
  mobileTabsStyle,
  modeSwitchTarget,
  openDrawer,
  pageTitle,
  sessionStore,
  showBottomTabs,
  showFooter,
  statusBadges,
  topDescription
} = useAppShell()
</script>

<template>
  <div class="min-h-screen bg-base text-body">
    <!-- Fixed Navbar: height 5rem (h-20), z-[9980] — matches $z-index-navbar -->
    <header
      class="navbar fixed right-0 top-0 z-[9980] flex h-20 items-center gap-4 bg-surface-2 px-6 shadow-lv1"
      :class="hasDrawer ? 'left-[320px] max-[1440px]:left-[280px] max-[1000px]:left-0' : 'left-0'"
    >
      <!-- Hamburger button: visible only at ≤1000px -->
      <button
        v-if="hasDrawer"
        class="hidden max-[1000px]:flex items-center justify-center rounded p-2 text-body transition hover:bg-surface-light"
        type="button"
        aria-label="メニューを開く"
        @click="openDrawer"
      >
        <span class="text-xl leading-none">☰</span>
      </button>

      <div v-if="hasDrawer" class="min-w-0">
        <p class="truncate text-lg font-semibold text-body">{{ pageTitle }}</p>
      </div>

      <RouterLink
        v-else
        class="flex flex-col text-body no-underline hover:no-underline"
        :to="isStaffRoute ? '/staff' : '/'"
      >
        <span class="text-lg font-semibold text-body">{{ appName }}</span>
        <span v-if="isStaffRoute" class="mt-1 text-xs text-muted">スタッフ</span>
      </RouterLink>
    </header>

    <!-- Drawer: uses AppDrawer component -->
    <AppDrawer
      v-if="hasDrawer"
      :is-small-screen="isSmallScreen"
      :is-drawer-open="isDrawerOpen"
      :drawer-translate-class="drawerTranslateClass"
      :app-name="appName"
      :app-mode-label="appModeLabel"
      :is-staff-route="isStaffRoute"
      :is-demo-mode="isDemoMode"
      :top-description="topDescription"
      :mode-switch-target="modeSwitchTarget"
      :is-authenticated="sessionStore.isAuthenticated"
      :links="drawerLinks"
      :auth-label="authLabel"
      :status-badges="statusBadges"
      :logout-pending="logoutMutation.isPending.value"
      @close-drawer="closeDrawer"
      @logout="handleLogout"
    />

    <!-- Main Content: offset by navbar height (pt-20) and drawer width (pl-*) -->
    <main :class="cn('content', mainContentClass)">
      <div class="flex min-h-[calc(100dvh-5rem)] flex-col">
        <div class="grow">
          <RouterView />
        </div>
        <footer
          v-if="showFooter"
          class="mt-6 border-t border-border px-6 py-6 text-center"
          :class="isStaffRoute && isDemoMode ? 'max-[1000px]:hidden' : ''"
        >
          <PublicFooterLinks :app-name="appName" :show-privacy-policy="!isDemoMode" />
        </footer>
      </div>
    </main>

    <!-- Bottom Tabs: fixed, only visible at ≤1000px — z-[9980] matches $z-index-bottom-tabs -->
    <nav
      v-if="showBottomTabs"
      class="fixed inset-x-0 bottom-0 z-[9980] hidden border-t border-border bg-surface-2 shadow-[0_-0.1rem_0.8rem_-0.6rem_var(--color-box-shadow)] max-[1000px]:block"
    >
      <div class="mx-auto grid w-full max-w-[600px] pb-[env(safe-area-inset-bottom)]" :style="mobileTabsStyle">
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
