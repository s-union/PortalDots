import { computed } from 'vue'
import { useSessionStore } from '@/features/session/store'
import { buildUserSettingsTabs, type UserSettingsTab } from '@/lib/ui/tabStrip'

export function useUserSettingsTabs(activeTab: UserSettingsTab) {
  const sessionStore = useSessionStore()

  return {
    sessionStore,
    tabs: computed(() => buildUserSettingsTabs(activeTab, sessionStore.isAuthenticated))
  }
}
