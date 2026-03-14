import type { RouteLocationNormalized, RouteLocationRaw } from "vue-router";
import { canAccessStaffCapability, hasStaffAccess } from "@/features/staff/access/capabilities";
import { fetchStaffStatus } from "@/features/staff/status/api";
import type { useSessionStore } from "@/features/session/store";
import { queryClient } from "@/app/providers/queryClient";

type SessionStore = ReturnType<typeof useSessionStore>;
type GuardResult = RouteLocationRaw | true;

export async function staffGuard(
  to: RouteLocationNormalized,
  sessionStore: SessionStore,
): Promise<GuardResult> {
  if (to.meta.requiresStaffRole && !hasStaffAccess(sessionStore.roles, sessionStore.permissions)) {
    return "/";
  }

  if (
    to.meta.staffCapability &&
    !canAccessStaffCapability(to.meta.staffCapability, sessionStore.roles, sessionStore.permissions)
  ) {
    return to.path === "/staff" ? true : "/staff";
  }

  if (to.meta.requiresStaffRole || to.meta.requiresStaffAuthorized) {
    const staffStatus = await queryClient.fetchQuery({
      queryKey: ["staff", "status"],
      queryFn: fetchStaffStatus,
    });

    if (to.path === "/staff/verify" && staffStatus.authorized) {
      return "/staff";
    }

    if (to.meta.requiresStaffAuthorized && !staffStatus.authorized) {
      return "/staff/verify";
    }
  }

  return true;
}
