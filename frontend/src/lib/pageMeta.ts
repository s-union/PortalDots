import type { StaffCapability } from '@/features/staff/access/capabilities'

export function staffPageMeta(capability?: StaffCapability, extra?: Record<string, unknown>) {
  return {
    requiresAuth: true as const,
    requiresStaffRole: true as const,
    requiresStaffAuthorized: true as const,
    ...(capability ? { staffCapability: capability } : {}),
    ...extra
  }
}
