import type { RouteLocationNormalized, RouteLocationRaw } from "vue-router";
import type { useSessionStore } from "@/features/session/store";

type SessionStore = ReturnType<typeof useSessionStore>;
type GuardResult = RouteLocationRaw | true;

export function authGuard(to: RouteLocationNormalized, sessionStore: SessionStore): GuardResult {
  if (to.meta.requiresAuth && !sessionStore.isAuthenticated) {
    return "/login";
  }
  if (to.meta.requiresCircle && sessionStore.currentCircle === null) {
    return "/circles/select";
  }
  return true;
}
