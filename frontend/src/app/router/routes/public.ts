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
    path: "/compat",
    component: () => import("@/pages/public/CompatPage.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    component: () => import("@/pages/public/NotFoundPage.vue"),
  },
];
