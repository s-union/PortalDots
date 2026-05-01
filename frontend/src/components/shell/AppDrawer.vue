<script setup lang="ts">
import ModeSwitchLink from '@/components/ui/ModeSwitchLink.vue'
import NavMenuLink from '@/components/ui/NavMenuLink.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import type { AppModeSwitchTarget, AppStatusBadge, DrawerNavLink } from '@/app/types/shell'

const {
  isSmallScreen,
  isDrawerOpen,
  drawerTranslateClass,
  appName,
  appModeLabel,
  isStaffRoute,
  isDemoMode,
  topDescription,
  modeSwitchTarget,
  isAuthenticated,
  links,
  authLabel,
  statusBadges,
  logoutPending
} = defineProps<{
  isSmallScreen: boolean
  isDrawerOpen: boolean
  drawerTranslateClass: string
  appName: string
  appModeLabel: string
  isStaffRoute: boolean
  isDemoMode: boolean
  topDescription: string
  modeSwitchTarget: AppModeSwitchTarget | null
  isAuthenticated: boolean
  links: DrawerNavLink[]
  authLabel: string
  statusBadges: AppStatusBadge[]
  logoutPending: boolean
}>()

const emit = defineEmits<{
  'close-drawer': []
  logout: []
}>()
</script>

<template>
  <div>
    <div
      v-if="isSmallScreen"
      class="fixed inset-0 z-[9989] bg-drawer-backdrop transition-[opacity,visibility] duration-300"
      :class="isDrawerOpen ? 'opacity-100 visible' : 'invisible opacity-0'"
      @click="emit('close-drawer')"
    />

    <aside
      class="drawer fixed left-0 top-0 z-[9990] h-full w-[320px] max-[1440px]:w-[280px] max-[1000px]:w-[320px] max-w-[80vw] overflow-y-auto border-r border-border bg-surface-2 transition-transform duration-300"
      :class="drawerTranslateClass"
    >
      <div class="flex h-full flex-col">
        <div class="border-b border-border px-6 pb-6 pt-[6.5rem]">
          <p class="text-lg font-semibold text-body">{{ appName }}</p>
          <div v-if="isStaffRoute || isDemoMode" class="mt-2 flex flex-col items-start gap-2">
            <span
              v-if="isStaffRoute"
              class="rounded bg-primary-light px-1.5 py-0 text-[0.75em] font-medium leading-[1.75] text-primary"
            >
              {{ appModeLabel }}
            </span>
            <p v-if="isDemoMode" class="text-sm leading-6 text-muted">デモサイト</p>
          </div>
          <p v-if="topDescription !== ''" class="mt-3 text-sm text-muted">{{ topDescription }}</p>
        </div>

        <div v-if="modeSwitchTarget && isAuthenticated" class="border-b border-border px-6 py-4">
          <ModeSwitchLink v-if="modeSwitchTarget" :to="modeSwitchTarget.to" :label="modeSwitchTarget.label" />
        </div>

        <nav class="flex-1 py-2" aria-label="メニュー">
          <NavMenuLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :label="link.label"
            :icon-class="link.iconClass"
            :active="link.active"
            :admin-only="link.adminOnly"
          />
        </nav>

        <div v-if="isAuthenticated || modeSwitchTarget" class="mt-auto border-t border-border px-6 py-6">
          <p v-if="isAuthenticated" class="text-sm text-muted text-center">{{ authLabel }}</p>
          <div v-if="statusBadges.length > 0" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="badge in statusBadges"
              :key="`drawer-${badge.label}`"
              :class="[
                'inline-flex items-center justify-center rounded px-1.5 text-[0.75em] font-medium leading-[1.75]',
                badge.variant === 'primary' && 'bg-primary-light text-primary',
                badge.variant === 'danger' && 'bg-danger-light text-danger'
              ]"
            >
              {{ badge.label }}
            </span>
          </div>
          <button
            v-if="isAuthenticated"
            :class="cn(buttonVariants({ variant: 'secondary', size: 'md', fullWidth: true }), 'mt-3')"
            :disabled="logoutPending"
            type="button"
            @click="emit('logout')"
          >
            ログアウト
          </button>
          <ModeSwitchLink v-else-if="modeSwitchTarget" :to="modeSwitchTarget.to" :label="modeSwitchTarget.label" />
        </div>
      </div>
    </aside>
  </div>
</template>
