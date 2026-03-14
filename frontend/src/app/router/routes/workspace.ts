import type { RouteRecordRaw } from "vue-router";

const requiresWorkspace = {
  requiresAuth: true,
  requiresCircle: true,
} as const;

export const workspaceRoutes: RouteRecordRaw[] = [
  {
    path: "/circles/select",
    component: () => import("@/pages/workspace/circles/CircleSelectorPage.vue"),
    meta: {
      requiresAuth: true,
    },
  },
  {
    path: "/workspace",
    component: () => import("@/pages/workspace/WorkspacePage.vue"),
    meta: requiresWorkspace,
  },
  {
    path: "/workspace/pages",
    component: () => import("@/pages/workspace/pages/PagesIndexPage.vue"),
    meta: requiresWorkspace,
  },
  {
    path: "/workspace/pages/:pageId",
    component: () => import("@/pages/workspace/pages/PageDetailPage.vue"),
    meta: requiresWorkspace,
  },
  {
    path: "/workspace/documents",
    component: () => import("@/pages/workspace/documents/DocumentsIndexPage.vue"),
    meta: requiresWorkspace,
  },
  {
    path: "/workspace/forms",
    component: () => import("@/pages/workspace/forms/FormsIndexPage.vue"),
    meta: requiresWorkspace,
  },
  {
    path: "/workspace/forms/:formId",
    component: () => import("@/pages/workspace/forms/FormDetailPage.vue"),
    meta: requiresWorkspace,
  },
  {
    path: "/workspace/contact",
    component: () => import("@/pages/workspace/contact/ContactPage.vue"),
    meta: requiresWorkspace,
  },
  {
    path: "/workspace/settings",
    component: () => import("@/pages/workspace/settings/UserSettingsPage.vue"),
    meta: {
      requiresAuth: true,
    },
  },
];
