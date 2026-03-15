import { createRouter, createWebHistory } from "vue-router";
import { pinia } from "@/app/providers/pinia";
import { type StaffCapability } from "@/features/staff/access/capabilities";
import { fetchSessionBootstrap } from "@/features/session/api";
import { useSessionStore } from "@/features/session/store";
import { queryClient } from "@/app/providers/queryClient";
import { publicGuard } from "@/app/router/guards/public";
import { authGuard } from "@/app/router/guards/auth";
import { staffGuard } from "@/app/router/guards/staff";
import { publicRoutes } from "@/app/router/routes/public";
import { staffRoutes } from "@/app/router/routes/staff";
import { workspaceRoutes } from "@/app/router/routes/workspace";

declare module "vue-router" {
    interface RouteMeta {
        publicOnly?: boolean;
        requiresAuth?: boolean;
        requiresCircle?: boolean;
        requiresStaffRole?: boolean;
        requiresStaffAuthorized?: boolean;
        staffCapability?: StaffCapability;
    }
}

export const router = createRouter({
    history: createWebHistory(),
    routes: [...publicRoutes, ...workspaceRoutes, ...staffRoutes],
});

async function ensureSessionStore() {
    const sessionStore = useSessionStore(pinia);

    try {
        const session = await queryClient.ensureQueryData({
            queryKey: ["session", "bootstrap"],
            queryFn: fetchSessionBootstrap,
        });
        sessionStore.hydrate(session);
    } catch {
        sessionStore.reset();
    }

    return sessionStore;
}

router.beforeEach(async (to) => {
    const needsSession =
        to.meta.publicOnly === true ||
        to.meta.requiresAuth === true ||
        to.meta.requiresCircle === true ||
        to.meta.requiresStaffRole === true ||
        to.meta.requiresStaffAuthorized === true ||
        to.meta.staffCapability !== undefined;

    if (!needsSession) return true;

    const sessionStore = await ensureSessionStore();

    for (const guard of [publicGuard, authGuard, staffGuard]) {
        const result = await guard(to, sessionStore);
        if (result !== true) return result;
    }

    return true;
});
