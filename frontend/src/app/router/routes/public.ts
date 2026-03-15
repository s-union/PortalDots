import type { RouteRecordRaw } from "vue-router";

export const publicRoutes: RouteRecordRaw[] = [
    {
        path: "/",
        component: () => import("@/pages/public/HomePage.vue"),
    },
    {
        path: "/login",
        component: () => import("@/pages/public/LoginPage.vue"),
        meta: {
            publicOnly: true,
        },
    },
    {
        path: "/:pathMatch(.*)*",
        component: () => import("@/pages/public/NotFoundPage.vue"),
    },
];
