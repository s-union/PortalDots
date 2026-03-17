import type { RouteLocationNormalized, RouteLocationRaw } from "vue-router";
import type { useSessionStore } from "@/features/session/store";
import { buildCircleSelectorLocation } from "@/app/router/circleSelectorRedirect";

type SessionStore = ReturnType<typeof useSessionStore>;
type GuardResult = RouteLocationRaw | true;

export function authGuard(to: RouteLocationNormalized, sessionStore: SessionStore): GuardResult {
    if (to.path === "/workspace" && sessionStore.isAuthenticated) {
        return "/";
    }

    if (to.meta.requiresAuth && !sessionStore.isAuthenticated) {
        return "/login";
    }
    if (to.meta.requiresCircle && sessionStore.currentCircle === null) {
        return buildCircleSelectorLocation(to.fullPath);
    }
    return true;
}
