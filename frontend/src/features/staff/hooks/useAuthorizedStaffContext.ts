import { computed } from 'vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'
import { canAccessStaffCapability, type StaffCapability } from '@/features/staff/access/capabilities'

export function useAuthorizedStaffContext(options?: { requiresCircle?: boolean; capability?: StaffCapability }) {
  const sessionStore = useSessionStore()
  const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
  const requiresCircle = options?.requiresCircle ?? false
  const capability = options?.capability
  const enabled = computed(() => {
    if (staffStatusQuery.data.value?.authorized !== true) {
      return false
    }
    if (capability && !canAccessStaffCapability(capability, sessionStore.roles, sessionStore.permissions ?? [])) {
      return false
    }
    if (!requiresCircle) {
      return true
    }
    return sessionStore.currentCircle !== null
  })

  return {
    sessionStore,
    staffStatusQuery,
    enabled
  }
}
