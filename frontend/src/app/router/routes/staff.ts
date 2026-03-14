import type { RouteRecordRaw } from "vue-router";

const requiresStaff = {
  requiresAuth: true,
  requiresStaffRole: true,
  requiresStaffAuthorized: true,
} as const;

const requiresStaffWithCircle = {
  ...requiresStaff,
  requiresCircle: true,
} as const;

export const staffRoutes: RouteRecordRaw[] = [
  {
    path: "/staff/activity-logs",
    component: () => import("@/pages/staff/admin/StaffActivityLogsPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "activityLogs.read",
    },
  },
  {
    path: "/staff/verify",
    component: () => import("@/pages/staff/verify/StaffVerifyPage.vue"),
    meta: {
      requiresAuth: true,
      requiresStaffRole: true,
    },
  },
  {
    path: "/staff",
    component: () => import("@/pages/staff/dashboard/StaffDashboardPage.vue"),
    meta: requiresStaff,
  },
  {
    path: "/staff/permissions/:userId",
    component: () => import("@/pages/staff/permissions/StaffPermissionDetailPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "permissions.read",
    },
  },
  {
    path: "/staff/pages",
    component: () => import("@/pages/staff/pages/StaffPagesIndexPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "pages.read",
    },
  },
  {
    path: "/staff/pages/:pageId",
    component: () => import("@/pages/staff/pages/StaffPageDetailPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "pages.edit",
    },
  },
  {
    path: "/staff/documents",
    component: () => import("@/pages/staff/documents/StaffDocumentsIndexPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "documents.read",
    },
  },
  {
    path: "/staff/documents/:documentId/edit",
    component: () => import("@/pages/staff/documents/StaffDocumentDetailPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "documents.edit",
    },
  },
  {
    path: "/staff/tags",
    component: () => import("@/pages/staff/masters/StaffTagsPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "tags.read",
    },
  },
  {
    path: "/staff/places",
    component: () => import("@/pages/staff/masters/StaffPlacesPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "places.read",
    },
  },
  {
    path: "/staff/contact-categories",
    component: () => import("@/pages/staff/masters/StaffContactCategoriesPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "contactCategories.read",
    },
  },
  {
    path: "/staff/forms",
    component: () => import("@/pages/staff/forms/StaffFormsIndexPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "forms.read",
    },
  },
  {
    path: "/staff/forms/:formId",
    component: () => import("@/pages/staff/forms/StaffFormDetailPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "forms.edit",
    },
  },
  {
    path: "/staff/forms/:formId/preview",
    component: () => import("@/pages/staff/forms/StaffFormPreviewPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "forms.read",
    },
  },
  {
    path: "/staff/forms/:formId/answers",
    component: () => import("@/pages/staff/forms/StaffFormAnswersIndexPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "formAnswers.read",
    },
  },
  {
    path: "/staff/forms/:formId/answers/create",
    component: () => import("@/pages/staff/forms/StaffFormAnswerCreatePage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "formAnswers.edit",
    },
  },
  {
    path: "/staff/forms/:formId/answers/uploads",
    component: () => import("@/pages/staff/forms/StaffFormAnswerUploadsPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "formAnswers.export",
    },
  },
  {
    path: "/staff/forms/:formId/answers/:answerId/edit",
    component: () => import("@/pages/staff/forms/StaffFormAnswerDetailPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "formAnswers.edit",
    },
  },
  {
    path: "/staff/permissions",
    component: () => import("@/pages/staff/permissions/StaffPermissionsPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "permissions.read",
    },
  },
  {
    path: "/staff/participation-types",
    component: () => import("@/pages/staff/participation-types/StaffParticipationTypesPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "circles.participationTypes",
    },
  },
  {
    path: "/staff/participation-types/:typeId",
    component: () => import("@/pages/staff/participation-types/StaffParticipationTypeDetailPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "circles.participationTypes",
    },
  },
  {
    path: "/staff/settings",
    component: () => import("@/pages/staff/settings/StaffPortalSettingsPage.vue"),
    meta: requiresStaff,
  },
  {
    path: "/staff/circles",
    component: () => import("@/pages/staff/circles/StaffCirclesIndexPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "circles.read",
    },
  },
  {
    path: "/staff/circles/:circleId",
    component: () => import("@/pages/staff/circles/StaffCircleDetailPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "circles.edit",
    },
  },
  {
    path: "/staff/exports",
    component: () => import("@/pages/staff/admin/StaffExportsPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "exports.use",
    },
  },
  {
    path: "/staff/mails",
    component: () => import("@/pages/staff/admin/StaffMailsPage.vue"),
    meta: {
      ...requiresStaffWithCircle,
      staffCapability: "mailQueue.use",
    },
  },
  {
    path: "/staff/users",
    component: () => import("@/pages/staff/users/StaffUsersIndexPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "users.read",
    },
  },
  {
    path: "/staff/users/:userId",
    component: () => import("@/pages/staff/users/StaffUserDetailPage.vue"),
    meta: {
      ...requiresStaff,
      staffCapability: "users.edit",
    },
  },
];
