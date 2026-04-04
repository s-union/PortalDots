<script setup lang="ts">
import { computed } from 'vue'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import LoadingMessage from '@/components/ui/LoadingMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import HomeModeTabs from '@/components/navigation/HomeModeTabs.vue'
import PageContentContainer from '@/components/ui/PageContentContainer.vue'
import { buildApiUrl } from '@/lib/api/client'
import { formatFileSize } from '@/lib/format/fileSize'
import { formatDateTime, formatDateTimeUpdated } from '@/lib/format/datetime'
import { usePublicHomeQuery, usePublicConfigQuery } from '@/features/public-home/api'
import { useFormsQuery, type FormSummary } from '@/features/forms/api'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'
import { hasStaffAccess } from '@/features/staff/access/capabilities'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const publicHomeQuery = usePublicHomeQuery(computed(() => true))
const publicConfigQuery = usePublicConfigQuery()
const formsQuery = useFormsQuery()

const canAccessStaff = computed(() => hasStaffAccess(sessionStore.roles, sessionStore.permissions))
const publicHome = computed(() => publicHomeQuery.data.value)
const publicPinnedPages = computed(() => publicHome.value?.pinnedPages ?? [])
const publicParticipationTypes = computed(() => publicHome.value?.participationTypes ?? [])
const publicPages = computed(() => publicHome.value?.pages ?? [])
const publicDocuments = computed(() => publicHome.value?.documents ?? [])
const publicLoginMethods = computed(() => publicHome.value?.loginMethods ?? [])
const isDemoMode = computed(() => publicConfigQuery.data.value?.isDemo ?? false)
const canCreateCircleRegistration = computed(() => sessionStore.user?.canCreateCircleRegistration !== false)
const openForms = computed(() => (formsQuery.data.value ?? []).filter((form) => form.isOpen))
const shouldShowOpenFormsPanel = computed(
  () =>
    sessionStore.isAuthenticated &&
    sessionStore.currentCircle !== null &&
    (formsQuery.isPending.value || openForms.value.length > 0)
)
const pagesIndexPath = computed(() => (sessionStore.isAuthenticated ? '/workspace/pages' : '/public/pages'))
const documentsIndexPath = computed(() => (sessionStore.isAuthenticated ? '/workspace/documents' : '/public/documents'))
const pageDetailPath = (pageId: string) =>
  sessionStore.isAuthenticated
    ? `/workspace/pages/${encodeURIComponent(pageId)}`
    : `/public/pages/${encodeURIComponent(pageId)}`
const participationTypePath = (participationTypeId: string) => {
  if (!sessionStore.isAuthenticated) {
    return '/register'
  }

  if (!canCreateCircleRegistration.value) {
    return '/circles/select'
  }

  return `/circles/new?participation_type=${encodeURIComponent(participationTypeId)}`
}

const workspaceFormPath = (formId: string) => `/workspace/forms/${encodeURIComponent(formId)}`

function isLimitedForm(form: FormSummary) {
  return form.answerableTags.length > 0
}

function formatOpenFormMeta(form: FormSummary) {
  const schedule = `${formatDateTime(form.closeAt)} まで受付`
  return form.maxAnswers > 1 ? `${schedule} • 1企画あたり${form.maxAnswers}つ回答可能` : schedule
}
</script>

<template>
  <section class="space-y-6">
    <HomeModeTabs v-if="sessionStore.isAuthenticated && canAccessStaff" :is-staff-page="false" />

    <header v-if="!sessionStore.isAuthenticated" class="border-b border-border bg-surface">
      <div
        class="mx-auto grid max-w-[1024px] gap-6 px-6 py-8 max-[1000px]:px-4 min-[1201px]:grid-cols-[minmax(0,1fr)_17.1rem]"
      >
        <div class="flex flex-col gap-2">
          <h1 class="text-[2rem] font-semibold leading-[1.4] text-body">
            <span
              v-if="isDemoMode"
              class="mr-3 inline-flex rounded-full border border-primary bg-primary-light px-3 py-1 align-middle text-xs font-bold text-primary"
            >
              PortalDots デモサイト
            </span>
            <span class="align-middle">{{ publicHome?.appName ?? 'PortalDots' }}</span>
          </h1>
          <p class="max-w-[42rem] text-base leading-[1.7] text-body">
            {{ publicHome?.portalDescription }}
          </p>
          <p class="text-[0.9rem] text-muted">
            {{ publicHome?.portalAdminName }}
          </p>
        </div>
        <div class="flex flex-col justify-center gap-4">
          <RouterLink
            class="block rounded border border-primary bg-primary px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-primary-hover"
            to="/login"
          >
            ログイン
          </RouterLink>
          <RouterLink
            class="block rounded border border-border bg-surface px-4 py-3 text-center text-sm font-semibold text-body transition hover:bg-surface-light"
            to="/register"
          >
            ユーザー登録
          </RouterLink>
        </div>
      </div>
    </header>

    <PageContentContainer class="space-y-0">
      <ListPanel v-for="page in publicPinnedPages" :key="page.id" legacy overflow-hidden>
        <div class="border-b border-border px-6 py-[1.2rem] max-[1000px]:px-4">
          <h2 class="text-[1.333rem] font-semibold leading-[1.4] text-body">{{ page.title }}</h2>
          <div class="mt-px flex flex-wrap items-center gap-2 text-base text-muted">
            <span>{{ formatDateTime(page.updatedAt) }}</span>
            <StatusBadge v-if="page.isLimited" tone="primary" appearance="outlined">限定公開</StatusBadge>
          </div>
        </div>
        <div class="px-6 py-[1.2rem] max-[1000px]:px-4">
          <PageMarkdownContent :source="page.body" />
        </div>
        <div v-if="page.documents.length > 0" class="border-t border-border px-6 py-[1.2rem] max-[1000px]:px-4">
          <div class="flex flex-wrap gap-3">
            <a
              v-for="document in page.documents"
              :key="document.id"
              :href="buildApiUrl(document.downloadUrl)"
              class="inline-flex flex-wrap items-center gap-2 rounded-full border border-border bg-form-control px-3 py-2 text-sm text-body transition hover:bg-surface-light hover:no-underline"
              rel="noreferrer"
              target="_blank"
            >
              <i v-if="document.isImportant" class="fas fa-exclamation-circle fa-fw text-danger" aria-hidden="true" />
              <i v-else class="far fa-file-alt fa-fw text-muted" aria-hidden="true" />
              <span>{{ document.name }}</span>
              <span class="text-xs text-muted">
                ({{ document.extension || 'FILE' }} • {{ formatFileSize(document.sizeBytes) }})
              </span>
            </a>
          </div>
        </div>
      </ListPanel>

      <ListPanel
        v-if="isDemoMode"
        legacy
        title="ログイン方法"
        :description="`以下の学生番号 / パスワードで${publicHome?.appName ?? 'PortalDots'}にログインできます。試しにログインして使ってみてください。`"
      >
        <LoadingMessage v-if="publicHomeQuery.isPending.value" />
        <div v-else class="overflow-x-auto px-6 py-4">
          <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                <th class="border-b border-border px-0 py-3 font-semibold text-body">ユーザー種別</th>
                <th class="border-b border-border px-4 py-3 font-semibold text-body">学生番号</th>
                <th class="border-b border-border px-0 py-3 font-semibold text-body">パスワード</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="method in publicLoginMethods" :key="`${method.roleLabel}-${method.loginId}`">
                <td class="border-b border-border py-3 pr-4 text-body">{{ method.roleLabel }}</td>
                <td class="border-b border-border px-4 py-3 text-body">
                  <code>{{ method.loginId }}</code>
                </td>
                <td class="border-b border-border py-3 text-body">
                  <code>{{ method.password }}</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ListPanel>

      <ListPanel legacy title="お問い合わせ先">
        <div class="px-6 py-6 text-sm leading-7 text-body">
          <p>{{ publicHome?.appName ?? 'PortalDots' }}に関するお問い合わせは以下のメールアドレスまでお送りください。</p>
          <p v-if="isDemoMode" class="mt-2 text-muted">
            {{ publicHome?.appName ?? 'PortalDots' }}内の[お問い合わせ]からお問い合わせいただくことはできません。
          </p>
          <p class="mt-4 font-semibold text-body">
            {{ publicHome?.portalContactEmail }}
          </p>
        </div>
      </ListPanel>

      <ListPanel v-if="publicParticipationTypes.length > 0" legacy title="企画参加登録">
        <div class="divide-y divide-border">
          <ListItemLink v-for="pt in publicParticipationTypes" :key="pt.id" legacy :to="participationTypePath(pt.id)">
            <template #title>{{ pt.name }}</template>
            <template #meta>{{ formatDateTime(pt.form.closeAt) }} まで受付</template>
            {{ pt.description }}
          </ListItemLink>
        </div>
      </ListPanel>

      <ListPanel legacy title="お知らせ">
        <LoadingMessage v-if="publicHomeQuery.isPending.value" />
        <div v-else-if="publicPages.length === 0" class="px-6 py-6 text-sm text-muted">
          公開中のお知らせはありません。
        </div>
        <div v-else class="divide-y divide-border">
          <ListItemLink v-for="page in publicPages" :key="page.id" legacy :to="pageDetailPath(page.id)">
            <template #title>{{ page.title }}</template>
            <template #prefix>
              <StatusBadge :tone="page.isLimited ? 'primary' : 'muted'" appearance="outlined">
                {{ page.isLimited ? '限定公開' : '全員に公開' }}
              </StatusBadge>
            </template>
            <template v-if="page.isNew" #suffix>
              <StatusBadge tone="danger" size="sm">NEW</StatusBadge>
            </template>
            <template #meta>{{ formatDateTime(page.updatedAt) }}</template>
            {{ page.summary }}
          </ListItemLink>
        </div>
        <RouterLink
          class="block border-t border-border px-6 py-6 text-center text-sm font-semibold text-primary transition hover:bg-form-control hover:no-underline"
          :to="pagesIndexPath"
        >
          他のお知らせを見る
        </RouterLink>
      </ListPanel>

      <ListPanel legacy title="最近の配布資料">
        <LoadingMessage v-if="publicHomeQuery.isPending.value" />
        <div v-else-if="publicDocuments.length === 0" class="px-6 py-6 text-sm text-muted">
          公開中の配布資料はありません。
        </div>
        <div v-else class="divide-y divide-border">
          <ListItemLink
            v-for="document in publicDocuments"
            :key="document.id"
            legacy
            :href="buildApiUrl(document.downloadUrl)"
            new-tab
          >
            <template #title>
              <i v-if="document.isImportant" class="fas fa-exclamation-circle fa-fw text-danger" aria-hidden="true" />
              <i v-else class="far fa-file-alt fa-fw text-muted" aria-hidden="true" />
              {{ document.name }}
            </template>
            <template v-if="document.isNew" #suffix>
              <StatusBadge tone="danger" size="sm">NEW</StatusBadge>
            </template>
            <template #meta>
              {{ formatDateTimeUpdated(document.updatedAt) }}
              <br />
              {{ document.extension || 'FILE' }} • {{ formatFileSize(document.sizeBytes) }}
            </template>
            {{ document.description }}
          </ListItemLink>
        </div>
        <RouterLink
          class="block border-t border-border px-6 py-6 text-center text-sm font-semibold text-primary transition hover:bg-form-control hover:no-underline"
          :to="documentsIndexPath"
        >
          他の配布資料を見る
        </RouterLink>
      </ListPanel>

      <ListPanel v-if="shouldShowOpenFormsPanel" legacy title="受付中の申請">
        <LoadingMessage v-if="formsQuery.isPending.value" />
        <div v-else class="divide-y divide-border">
          <ListItemLink v-for="form in openForms" :key="form.id" legacy :to="workspaceFormPath(form.id)">
            <template #title>{{ form.name }}</template>
            <template #prefix>
              <StatusBadge :tone="isLimitedForm(form) ? 'primary' : 'muted'" appearance="outlined">
                {{ isLimitedForm(form) ? '限定公開' : '全員に公開' }}
              </StatusBadge>
            </template>
            <template #meta>{{ formatOpenFormMeta(form) }}</template>
            {{ form.description }}
          </ListItemLink>
        </div>
        <RouterLink
          v-if="!formsQuery.isPending.value && openForms.length > 0"
          class="block border-t border-border px-6 py-6 text-center text-sm font-semibold text-primary transition hover:bg-form-control hover:no-underline"
          to="/workspace/forms"
        >
          他の受付中の申請を見る
        </RouterLink>
      </ListPanel>
    </PageContentContainer>
  </section>
</template>
