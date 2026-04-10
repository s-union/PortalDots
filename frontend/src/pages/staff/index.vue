<script setup lang="ts">
definePage({
  path: '/staff',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true
  }
})

import { computed } from 'vue'
import HomeModeTabs from '@/components/navigation/HomeModeTabs.vue'
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
  canUseStaffExports,
  canManagePortalSettings,
  canUseMailQueue,
  canViewActivityLogs
} from '@/features/staff/access/capabilities'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const publicConfigQuery = usePublicConfigQuery()
const appName = computed(() => publicConfigQuery.data.value?.appName ?? 'PortalDots')
const isDemoMode = computed(() => publicConfigQuery.data.value?.isDemo ?? false)
const pageAdminAvailable = computed(() => canReadPages(sessionStore.roles, sessionStore.permissions))
const mailQueueAvailable = computed(() => canUseMailQueue(sessionStore.roles, sessionStore.permissions))
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
const activityLogAvailable = computed(() => canViewActivityLogs(sessionStore.roles, sessionStore.permissions))
const portalSettingsAvailable = computed(() => canManagePortalSettings(sessionStore.roles, sessionStore.permissions))

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
    description: `${appName.value}に登録しているユーザーの情報を管理します`,
    hidden: !userAdminAvailable.value
  },
  {
    to: '/staff/circles',
    title: '企画情報管理',
    iconClass: 'fas fa-star fa-fw',
    description: `${appName.value}に登録している企画の情報の管理や、企画参加登録フォームの設定を行います`,
    hidden: !circleAdminAvailable.value
  },
  {
    to: '/staff/circles/participation_types',
    title: '参加種別管理',
    iconClass: 'fas fa-list fa-fw',
    description: '企画参加登録に利用する参加種別を管理します',
    hidden: isDemoMode.value || !participationTypeAvailable.value
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
    description: `${appName.value}上に表示するお知らせを管理します。お知らせはメールで一斉配信できます`,
    hidden: !pageAdminAvailable.value
  },
  {
    to: '/staff/mails',
    title: 'メール配信設定',
    iconClass: 'far fa-envelope fa-fw',
    description: '配信予約中のメールを確認し、必要に応じてキューを全件キャンセルします',
    hidden: isDemoMode.value || !mailQueueAvailable.value
  },
  {
    to: '/staff/documents',
    title: '配布資料管理',
    iconClass: 'far fa-file-alt fa-fw',
    description: `${appName.value}上で配布する資料(ファイル)を管理します`,
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
    description: `${appName.value}のお問い合わせフォームの受付方法を設定します`,
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
    to: '/staff/exports',
    title: 'CSV / ZIP 出力',
    iconClass: 'fas fa-file-export fa-fw',
    description: '各種データのエクスポートを行います',
    hidden: isDemoMode.value || !exportAvailable.value
  }
])

const visibleStaffCards = computed(() => staffCards.value.filter((card) => card.hidden !== true))
</script>

<template>
  <PageLayout class="max-w-full space-y-0">
    <HomeModeTabs :is-staff-page="true" />

    <section v-if="visibleStaffCards.length > 0" class="px-6 pb-6 pt-6 max-[1000px]:px-4">
      <div class="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
        <RouterLink
          v-for="card in visibleStaffCards"
          :key="card.to"
          :to="card.to"
          class="block h-full rounded-[0.45rem] bg-surface text-body no-underline shadow-lv1 transition-colors duration-150 hover:bg-surface-light hover:no-underline"
        >
          <div class="flex h-full flex-col items-center px-6 py-8 text-center">
            <span
              class="mb-4 flex h-12 w-12 items-center justify-center rounded-[0.45rem] bg-primary-light text-[1.75rem] leading-none text-primary"
            >
              <i :class="card.iconClass" aria-hidden="true" />
            </span>
            <p class="flex flex-wrap items-center justify-center gap-2 text-[1.1rem] font-bold">
              <span>{{ card.title }}</span>
              <span
                v-if="card.adminOnly"
                class="inline-flex h-[1.75em] items-center justify-center rounded-[0.2rem] bg-danger-light px-[0.4rem] text-[0.75em] font-medium leading-[1.2] text-danger"
              >
                管理者
              </span>
            </p>
            <p class="mt-2 text-muted">
              {{ card.description }}
            </p>
          </div>
        </RouterLink>
      </div>
    </section>

    <section v-else class="px-6 pb-6 pt-6 max-[1000px]:px-4">
      <div class="rounded-[0.45rem] bg-surface px-6 py-10 text-center text-muted shadow-lv1">
        利用可能なスタッフ機能がありません。管理者にアクセス権の付与を依頼してください。
      </div>
    </section>
  </PageLayout>
</template>
