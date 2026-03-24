<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true
  }
})

import { computed } from 'vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { buildHomeModeTabs } from '@/features/ui/tabStrip'
import PageLayout from '@/components/layouts/PageLayout.vue'
import {
  canManageCircles,
  canManageParticipationTypes,
  canManagePermissions,
  canManageUsers,
  canReadContactCategories,
  canReadDocuments,
  canReadForms,
  canReadPages,
  canReadPlaces,
  canReadTags,
  canUseMailQueue,
  canUseStaffExports,
  canManagePortalSettings,
  canViewActivityLogs
} from '@/features/staff/access/capabilities'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const pageAdminAvailable = computed(() => canReadPages(sessionStore.roles, sessionStore.permissions))
const documentAdminAvailable = computed(() => canReadDocuments(sessionStore.roles, sessionStore.permissions))
const tagAdminAvailable = computed(() => canReadTags(sessionStore.roles, sessionStore.permissions))
const placeAdminAvailable = computed(() => canReadPlaces(sessionStore.roles, sessionStore.permissions))
const contactCategoryAvailable = computed(() => canReadContactCategories(sessionStore.roles, sessionStore.permissions))
const circleAdminAvailable = computed(() => canManageCircles(sessionStore.roles, sessionStore.permissions))
const participationTypeAvailable = computed(() =>
  canManageParticipationTypes(sessionStore.roles, sessionStore.permissions)
)
const formsAdminAvailable = computed(() => canReadForms(sessionStore.roles, sessionStore.permissions))
const userAdminAvailable = computed(() => canManageUsers(sessionStore.roles, sessionStore.permissions))
const permissionAdminAvailable = computed(() => canManagePermissions(sessionStore.roles, sessionStore.permissions))
const exportAvailable = computed(() => canUseStaffExports(sessionStore.roles, sessionStore.permissions))
const mailQueueAvailable = computed(() => canUseMailQueue(sessionStore.roles, sessionStore.permissions))
const activityLogAvailable = computed(() => canViewActivityLogs(sessionStore.roles, sessionStore.permissions))
const portalSettingsAvailable = computed(() => canManagePortalSettings(sessionStore.roles, sessionStore.permissions))

const homeTabs = computed(() => buildHomeModeTabs(true))

interface StaffCard {
  to: string
  title: string
  iconClass: string
  description: string
  hidden?: boolean
  disabled?: boolean
  adminOnly?: boolean
}

const staffCards = computed<StaffCard[]>(() => [
  {
    to: '/staff/users',
    title: 'ユーザー情報管理',
    iconClass: 'far fa-address-book fa-fw',
    description: 'PortalDotsに登録しているユーザーの情報を管理します',
    hidden: !userAdminAvailable.value
  },
  {
    to: '/staff/circles',
    title: '企画情報管理',
    iconClass: 'fas fa-star fa-fw',
    description: 'PortalDotsに登録している企画の情報の管理や、企画参加登録フォームの設定を行います',
    hidden: !circleAdminAvailable.value
  },
  {
    to: '/staff/tags',
    title: '企画タグ管理',
    iconClass: 'fas fa-tags fa-fw',
    description: '企画を分類するためのタグを管理します',
    hidden: !tagAdminAvailable.value
  },
  {
    to: '/staff/places',
    title: '場所情報管理',
    iconClass: 'fas fa-store fa-fw',
    description: '企画が利用できる場所の情報を管理します',
    hidden: !placeAdminAvailable.value
  },
  {
    to: '/staff/pages',
    title: 'お知らせ管理',
    iconClass: 'fas fa-bullhorn fa-fw',
    description: 'PortalDots上に表示するお知らせを管理します。お知らせはメールで一斉配信できます',
    hidden: !pageAdminAvailable.value
  },
  {
    to: '/staff/documents',
    title: '配布資料管理',
    iconClass: 'far fa-file-alt fa-fw',
    description: 'PortalDots上で配布する資料(ファイル)を管理します',
    hidden: !documentAdminAvailable.value
  },
  {
    to: '/staff/forms',
    title: '申請管理',
    iconClass: 'far fa-edit fa-fw',
    description: '各企画から受け付ける申請フォームの作成や、提出された申請の確認を行います',
    hidden: !formsAdminAvailable.value
  },
  {
    to: '/staff/contact-categories',
    title: 'お問い合わせ受付設定',
    iconClass: 'fas fa-at fa-fw',
    description: 'PortalDotsのお問い合わせフォームの受付方法を設定します',
    hidden: !contactCategoryAvailable.value
  },
  {
    to: '/staff/permissions',
    title: 'スタッフの権限設定',
    iconClass: 'fas fa-key fa-fw',
    description: 'スタッフモードで利用可能な機能を、スタッフごとに制限できます',
    hidden: !permissionAdminAvailable.value
  },
  {
    to: '/staff/activity-logs',
    title: 'アクティビティログ',
    iconClass: 'fas fa-user-edit fa-fw',
    description: 'PortalDots内で行われた各種データ操作の履歴を確認します',
    hidden: !activityLogAvailable.value,
    adminOnly: true
  },
  {
    to: '/staff/settings/portal',
    title: 'PortalDots の設定',
    iconClass: 'fas fa-cog fa-fw',
    description: 'このウェブシステムの設定を変更します',
    hidden: !portalSettingsAvailable.value,
    adminOnly: true
  },
  {
    to: '/staff/about',
    title: 'PortalDots のアップデートの確認',
    iconClass: 'fa-solid fa-arrows-rotate fa-fw',
    description: 'セキュリティのため、定期的に PortalDots をアップデートしましょう'
  },
  {
    to: '/staff/participation-types',
    title: '参加種別管理',
    iconClass: 'fas fa-list fa-fw',
    description: '企画参加登録に利用する参加種別を管理します',
    hidden: !participationTypeAvailable.value
  },
  {
    to: '/staff/exports',
    title: 'CSV / ZIP 出力',
    iconClass: 'fas fa-file-export fa-fw',
    description: '各種データのエクスポートを行います',
    hidden: !exportAvailable.value
  },
  {
    to: '/staff/mails',
    title: 'メールキュー',
    iconClass: 'far fa-envelope fa-fw',
    description: 'メール配信の状態を確認します',
    hidden: !mailQueueAvailable.value
  }
])
</script>

<template>
  <PageLayout>
    <TabStrip :tabs="homeTabs" />

    <section class="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
      <RouterLink
        v-for="card in staffCards"
        v-show="card.hidden !== true"
        :key="card.to"
        :to="card.to"
        class="rounded border border-border bg-surface p-5 text-body no-underline shadow-lv1 transition hover:bg-form-control hover:no-underline"
      >
        <p class="flex items-center gap-2 text-base font-semibold">
          <i :class="card.iconClass" aria-hidden="true" />
          <span>{{ card.title }}</span>
          <span
            v-if="card.adminOnly"
            class="inline-flex items-center justify-center rounded bg-danger-light px-1.5 text-[0.75em] font-medium leading-[1.75] text-danger"
          >
            管理者
          </span>
        </p>
        <p class="mt-2 text-sm leading-7 text-muted">
          {{ card.description }}
        </p>
      </RouterLink>
    </section>

    <section v-if="staffCards.filter((card) => card.hidden !== true).length === 0">
      <div class="rounded border border-border bg-surface px-6 py-10 text-center text-muted shadow-lv1">
        利用可能なスタッフ機能がありません。管理者にアクセス権の付与を依頼してください。
      </div>
    </section>
  </PageLayout>
</template>
