import type { RouteLocationNormalized, RouteLocationRaw } from "vue-router";
import type { useSessionStore } from "@/features/session/store";

type SessionStore = ReturnType<typeof useSessionStore>;
type GuardResult = RouteLocationRaw | true;

export function publicGuard(to: RouteLocationNormalized, sessionStore: SessionStore): GuardResult {
    if (to.meta.publicOnly) {
        return sessionStore.isAuthenticated ? "/" : true;
    }
    return true;
}
