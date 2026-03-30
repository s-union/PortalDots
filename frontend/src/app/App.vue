<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppDrawer from '@/components/shell/AppDrawer.vue'
import BottomTabLink from '@/components/ui/BottomTabLink.vue'
import PublicFooterLinks from '@/components/ui/PublicFooterLinks.vue'
import { useSessionBootstrapQuery } from '@/features/session/api'
import { useLogoutMutation } from '@/features/auth/api'
import { useSessionStore } from '@/features/session/store'
import { cn } from '@/lib/ui/cn'
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
  canManageParticipationTypes,
  canManagePortalSettings,
  canUseMailQueue,
  canUseStaffExports,
  canViewActivityLogs,
  hasStaffAccess
} from '@/features/staff/access/capabilities'
import { usePublicConfigQuery } from '@/features/public-home/api'
import type { AppModeSwitchTarget, DrawerNavLink } from '@/app/types/shell'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const bootstrapQuery = useSessionBootstrapQuery()
const logoutMutation = useLogoutMutation()
const publicConfigQuery = usePublicConfigQuery()
const appName = computed(() => publicConfigQuery.data.value?.appName ?? 'PortalDots')
const isDemoMode = computed(() => publicConfigQuery.data.value?.isDemo ?? false)

const isDrawerOpen = ref(false)
const isSmallScreen = ref(typeof window !== 'undefined' && window.innerWidth <= 1000)

onMounted(() => {
  const mq = window.matchMedia('(max-width: 1000px)')
  mq.addEventListener('change', (e) => {
    isSmallScreen.value = e.matches
    if (!e.matches) {
      isDrawerOpen.value = false
    }
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      isDrawerOpen.value = false
    }
  })
})

// On small screens: slide in/out. On desktop: always visible (no transform).
const drawerTranslateClass = computed(() => {
  if (!isSmallScreen.value) {
    return ''
  }
  return isDrawerOpen.value ? 'translate-x-0' : '-translate-x-full'
})

const canAccessStaff = computed(() => hasStaffAccess(sessionStore.roles, sessionStore.permissions))
const canAccessUsers = computed(() => canReadUsers(sessionStore.roles, sessionStore.permissions))
const canAccessCircles = computed(() => canReadCircles(sessionStore.roles, sessionStore.permissions))
const canAccessTags = computed(() => canReadTags(sessionStore.roles, sessionStore.permissions))
const canAccessPlaces = computed(() => canReadPlaces(sessionStore.roles, sessionStore.permissions))
const canAccessPages = computed(() => canReadPages(sessionStore.roles, sessionStore.permissions))
const canAccessDocuments = computed(() => canReadDocuments(sessionStore.roles, sessionStore.permissions))
const canAccessForms = computed(() => canReadForms(sessionStore.roles, sessionStore.permissions))
const canAccessContactCategories = computed(() =>
  canReadContactCategories(sessionStore.roles, sessionStore.permissions)
)
const canAccessPermissions = computed(() => canReadPermissions(sessionStore.roles, sessionStore.permissions))
const canAccessParticipationTypes = computed(() =>
  canManageParticipationTypes(sessionStore.roles, sessionStore.permissions)
)
const canAccessExports = computed(() => canUseStaffExports(sessionStore.roles, sessionStore.permissions))
const canAccessMails = computed(() => canUseMailQueue(sessionStore.roles, sessionStore.permissions))
const canAccessActivityLogs = computed(() => canViewActivityLogs(sessionStore.roles, sessionStore.permissions))
const canAccessPortalSettings = computed(() => canManagePortalSettings(sessionStore.roles, sessionStore.permissions))
const isStaffRoute = computed(() => route.path.startsWith('/staff'))
const hasDrawer = computed(() => route.meta.noDrawer !== true)
const showFooter = computed(() => route.meta.noFooter !== true)
const showBottomTabs = computed(() => !isStaffRoute.value && route.meta.noBottomTabs !== true && hasDrawer.value)
const appModeLabel = computed(() => (isStaffRoute.value ? 'スタッフモード' : '一般モード'))
const circleActionLabel = computed(() => (sessionStore.currentCircle === null ? '企画を選択' : '企画を切り替え'))
const circleName = computed(() => sessionStore.currentCircle?.name ?? '企画未選択')

const authLabel = computed(() => {
  if (bootstrapQuery.isLoading.value) {
    return '読み込み中'
  }
  if (!sessionStore.isAuthenticated) {
    return 'ログインしていません'
  }
  return `${sessionStore.user?.displayName ?? '不明なユーザー'}としてログイン中`
})

const topDescription = computed(() =>
  isStaffRoute.value ? authLabel.value : `現在の企画: ${sessionStore.currentCircle?.name ?? '未選択'}`
)

const modeSwitchTarget = computed<AppModeSwitchTarget | null>(() => {
  if (sessionStore.isAuthenticated && canAccessStaff.value && !isStaffRoute.value) {
    return { to: '/staff', label: 'スタッフモードへ' }
  }
  if (sessionStore.isAuthenticated && canAccessStaff.value && isStaffRoute.value) {
    return { to: '/', label: '一般モードへ' }
  }
  if (!sessionStore.isAuthenticated) {
    return { to: '/login', label: 'ログイン' }
  }
  return null
})

const generalLinks = computed<DrawerNavLink[]>(() => [
  {
    to: '/',
    label: 'ホーム',
    iconClass: 'fas fa-home fa-fw',
    active: route.path === '/'
  },
  {
    to: sessionStore.isAuthenticated ? '/workspace/pages' : '/public/pages',
    label: 'お知らせ',
    iconClass: 'fas fa-bullhorn fa-fw',
    active: route.path.startsWith('/workspace/pages') || route.path.startsWith('/public/pages')
  },
  {
    to: sessionStore.isAuthenticated ? '/workspace/documents' : '/public/documents',
    label: '配布資料',
    iconClass: 'far fa-file-alt fa-fw',
    active: route.path.startsWith('/workspace/documents') || route.path.startsWith('/public/documents')
  },
  {
    to: '/workspace/forms',
    label: '申請',
    iconClass: 'far fa-edit fa-fw',
    active: route.path.startsWith('/workspace/forms'),
    hidden: sessionStore.currentCircle === null
  },
  {
    to: '/workspace/contact',
    label: 'お問い合わせ',
    iconClass: 'far fa-envelope fa-fw',
    active: route.path.startsWith('/workspace/contact'),
    hidden: !sessionStore.isAuthenticated
  },
  {
    to: sessionStore.isAuthenticated ? '/workspace/settings' : '/workspace/settings/appearance',
    label: 'ユーザー設定',
    iconClass: 'fas fa-cog fa-fw',
    active: route.path.startsWith('/workspace/settings')
  }
])

const mobileTabs = computed(() => [
  {
    to: '/',
    label: 'ホーム',
    iconClass: 'fas fa-home',
    active: route.path === '/'
  },
  {
    to: sessionStore.isAuthenticated ? '/workspace/pages' : '/public/pages',
    label: 'お知らせ',
    iconClass: 'fas fa-bullhorn',
    active: route.path.startsWith('/workspace/pages') || route.path.startsWith('/public/pages'),
    showNotifier: false
  },
  {
    to: sessionStore.isAuthenticated ? '/workspace/documents' : '/public/documents',
    label: '配布資料',
    iconClass: 'far fa-file-alt',
    active: route.path.startsWith('/workspace/documents') || route.path.startsWith('/public/documents')
  },
  {
    to: '/workspace/forms',
    label: '申請',
    iconClass: 'far fa-edit',
    active: route.path.startsWith('/workspace/forms'),
    hidden: !sessionStore.isAuthenticated || sessionStore.currentCircle === null
  },
  {
    to: '/workspace/contact',
    label: 'お問い合わせ',
    iconClass: 'far fa-envelope',
    active: route.path.startsWith('/workspace/contact'),
    hidden: !sessionStore.isAuthenticated
  }
])

const staffLinks = computed<DrawerNavLink[]>(() => [
  {
    to: '/staff',
    label: 'スタッフモード ホーム',
    iconClass: 'fas fa-home fa-fw',
    active: route.path === '/staff'
  },
  {
    to: '/staff/users',
    label: 'ユーザー情報管理',
    iconClass: 'far fa-address-book fa-fw',
    active: route.path.startsWith('/staff/users'),
    hidden: !canAccessUsers.value
  },
  {
    to: '/staff/circles',
    label: '企画情報管理',
    iconClass: 'fas fa-star fa-fw',
    active: route.path.startsWith('/staff/circles'),
    hidden: !canAccessCircles.value
  },
  {
    to: '/staff/circles/participation_types',
    label: '参加種別管理',
    iconClass: 'fas fa-list fa-fw',
    active:
      route.path.startsWith('/staff/circles/participation_types') ||
      route.path.startsWith('/staff/participation-types'),
    hidden: isDemoMode.value || !canAccessParticipationTypes.value
  },
  {
    to: '/staff/tags',
    label: '企画タグ管理',
    iconClass: 'fas fa-tags fa-fw',
    active: route.path.startsWith('/staff/tags'),
    hidden: !canAccessTags.value
  },
  {
    to: '/staff/places',
    label: '場所情報管理',
    iconClass: 'fas fa-store fa-fw',
    active: route.path.startsWith('/staff/places'),
    hidden: !canAccessPlaces.value
  },
  {
    to: '/staff/pages',
    label: 'お知らせ管理',
    iconClass: 'fas fa-bullhorn fa-fw',
    active: route.path.startsWith('/staff/pages'),
    hidden: !canAccessPages.value
  },
  {
    to: '/staff/documents',
    label: '配布資料管理',
    iconClass: 'far fa-file-alt fa-fw',
    active: route.path.startsWith('/staff/documents'),
    hidden: !canAccessDocuments.value
  },
  {
    to: '/staff/forms',
    label: '申請管理',
    iconClass: 'far fa-edit fa-fw',
    active: route.path.startsWith('/staff/forms'),
    hidden: !canAccessForms.value
  },
  {
    to: '/staff/contacts/categories',
    label: 'お問い合わせ受付設定',
    iconClass: 'fas fa-at fa-fw',
    active: route.path.startsWith('/staff/contacts/categories'),
    hidden: !canAccessContactCategories.value
  },
  {
    to: '/staff/permissions',
    label: 'スタッフの権限設定',
    iconClass: 'fas fa-key fa-fw',
    active: route.path.startsWith('/staff/permissions'),
    hidden: !canAccessPermissions.value
  },
  {
    to: '/staff/activity-logs',
    label: 'アクティビティログ',
    iconClass: 'fas fa-user-edit fa-fw',
    active: route.path.startsWith('/staff/activity-logs'),
    hidden: !canAccessActivityLogs.value,
    adminOnly: true
  },
  {
    to: '/staff/settings/portal',
    label: 'PortalDots の設定',
    iconClass: 'fas fa-cog fa-fw',
    active: route.path.startsWith('/staff/settings'),
    hidden: !canAccessPortalSettings.value,
    adminOnly: true
  },
  {
    to: '/staff/about',
    label: 'PortalDots のアップデートの確認',
    iconClass: 'fa-solid fa-arrows-rotate fa-fw',
    active: route.path.startsWith('/staff/about')
  },
  {
    to: '/staff/exports',
    label: 'CSV / ZIP 出力',
    iconClass: 'fas fa-file-export fa-fw',
    active: route.path.startsWith('/staff/exports'),
    hidden: isDemoMode.value || !canAccessExports.value
  },
  {
    to: '/staff/mails',
    label: 'メールキュー',
    iconClass: 'far fa-envelope fa-fw',
    active: route.path.startsWith('/staff/mails'),
    hidden: isDemoMode.value || !canAccessMails.value
  }
])

const mobileTabsStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(mobileTabs.value.filter((link) => link.hidden !== true).length, 1)}, minmax(0, 1fr))`
}))
const statusBadges = computed(() => {
  if (!sessionStore.isAuthenticated) {
    return []
  }

  const badges: { label: string; variant: 'primary' | 'danger' }[] = []
  if (canAccessStaff.value) {
    badges.push({ label: 'スタッフ', variant: 'primary' })
  }
  if (sessionStore.roles.includes('admin')) {
    badges.push({ label: '管理者', variant: 'danger' })
  }
  return badges
})

const drawerLinks = computed(() => {
  const links = isStaffRoute.value ? staffLinks.value : generalLinks.value
  return links.filter((link) => link.hidden !== true)
})

function handleCloseDrawer() {
  isDrawerOpen.value = false
}

const pageTitle = computed(() => {
  if (route.path === '/login') {
    return 'ログイン'
  }
  if (route.path === '/register') {
    return 'ユーザー登録'
  }
  if (route.path === '/support') {
    return '推奨動作環境'
  }
  if (route.path === '/privacy_policy') {
    return 'プライバシーポリシー'
  }
  if (route.path === '/circles/select') {
    return '企画を選択'
  }
  if (route.path === '/circles/new') {
    return '新しい企画を作成'
  }
  if (route.path === '/staff') {
    return 'スタッフモード'
  }
  if (route.path === '/staff/about') {
    return 'PortalDotsについて'
  }

  const activeLink = [...(isStaffRoute.value ? staffLinks.value : generalLinks.value)].find((link) => link.active)
  return activeLink?.label ?? 'PortalDots'
})

watchEffect(() => {
  if (typeof document === 'undefined') {
    return
  }

  const currentAppName = appName.value
  if (pageTitle.value === 'PortalDots' || pageTitle.value === currentAppName) {
    document.title = currentAppName
    return
  }

  document.title = `${pageTitle.value} — ${currentAppName}`
})

const mainContentClass = computed(() =>
  cn(
    'pt-20',
    hasDrawer.value && 'pl-[320px] max-[1440px]:pl-[280px] max-[1000px]:pl-0',
    showBottomTabs.value && 'max-[1000px]:pb-[calc(env(safe-area-inset-bottom)+4.5rem)]'
  )
)

async function handleLogout() {
  await logoutMutation.mutateAsync()
  await router.push('/login')
}
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
        @click="isDrawerOpen = true"
      >
        <span class="text-xl leading-none">☰</span>
      </button>

      <div v-if="hasDrawer" class="min-w-0">
        <p class="truncate text-lg font-semibold text-body">{{ pageTitle }}</p>
        <p class="mt-1 text-xs text-muted">{{ appModeLabel }}</p>
      </div>

      <RouterLink
        v-else
        class="text-lg font-semibold text-body no-underline hover:no-underline"
        :to="isStaffRoute ? '/staff' : '/'"
      >
        PortalDots
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
      :circle-name="circleName"
      :circle-action-label="circleActionLabel"
      :links="drawerLinks"
      :auth-label="authLabel"
      :status-badges="statusBadges"
      :logout-pending="logoutMutation.isPending.value"
      @close-drawer="handleCloseDrawer"
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
          <PublicFooterLinks :app-name="appName" :show-privacy-policy="!(isStaffRoute && isDemoMode)" />
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
