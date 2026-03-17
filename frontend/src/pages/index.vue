<script setup lang="ts">
import { computed } from "vue";
import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import TabStrip from "@/components/ui/TabStrip.vue";
import { buildApiUrl } from "@/lib/api/client";
import { formatFileSize } from "@/lib/format/fileSize";
import { useDocumentsPageQuery } from "@/features/documents/api";
import { useFormsQuery } from "@/features/forms/api";
import { usePagesQuery } from "@/features/pages/api";
import { usePublicHomeQuery } from "@/features/public-home/api";
import { hasStaffAccess } from "@/features/staff/access/capabilities";
import {
  useSelectableCirclesQuery,
  useSelectCurrentCircleMutation,
  useCurrentCircleDetailQuery,
} from "@/features/circles/api";
import { useParticipationTypesQuery } from "@/features/participation-types/api";
import { useSessionStore } from "@/features/session/store";
import { buildHomeModeTabs } from "@/features/ui/tabStrip";

const sessionStore = useSessionStore();
const circlesQuery = useSelectableCirclesQuery();
const selectCircleMutation = useSelectCurrentCircleMutation();
const participationTypesQuery = useParticipationTypesQuery(
  computed(() => sessionStore.isAuthenticated),
);
const circleDetailQuery = useCurrentCircleDetailQuery();
const pagesQuery = usePagesQuery(computed(() => ""));
const documentsQuery = useDocumentsPageQuery(
  computed(() => ({
    page: 1,
    pageSize: 3,
  })),
);
const formsQuery = useFormsQuery();
const publicHomeQuery = usePublicHomeQuery(computed(() => !sessionStore.isAuthenticated));

const canAccessStaff = computed(() => hasStaffAccess(sessionStore.roles, sessionStore.permissions));
const homeTabs = computed(() => buildHomeModeTabs(false));
const hasSelectableCircles = computed(() => (circlesQuery.data.value?.length ?? 0) > 0);
const isSelectingCircle = computed(() => selectCircleMutation.isPending.value);
const selectedCircleSummary = computed(
  () =>
    (circlesQuery.data.value ?? []).find(
      (circle) => circle.id === sessionStore.currentCircle?.id,
    ) ?? null,
);
const recentPages = computed(() => (pagesQuery.data.value ?? []).slice(0, 3));
const recentDocuments = computed(() => documentsQuery.data.value?.items ?? []);
const openForms = computed(() =>
  (formsQuery.data.value ?? []).filter((form) => form.isOpen).slice(0, 3),
);
const participationTypesWithForm = computed(() =>
  (participationTypesQuery.data.value ?? []).filter((pt) => pt.form.isOpen && pt.form.isPublic),
);
const publicHome = computed(() => publicHomeQuery.data.value);
const publicPinnedPages = computed(() => publicHome.value?.pinnedPages ?? []);
const publicParticipationTypes = computed(() => publicHome.value?.participationTypes ?? []);
const publicPages = computed(() => publicHome.value?.pages ?? []);
const publicDocuments = computed(() => publicHome.value?.documents ?? []);
const publicLoginMethods = computed(() => publicHome.value?.loginMethods ?? []);
const showEmptyState = computed(
  () =>
    sessionStore.isAuthenticated &&
    !sessionStore.currentCircle &&
    recentPages.value.length === 0 &&
    recentDocuments.value.length === 0 &&
    openForms.value.length === 0,
);

async function handleSelectCircle(circleId: string) {
  await selectCircleMutation.mutateAsync(circleId);
}
</script>

<template>
  <section class="space-y-6">
    <TabStrip v-if="sessionStore.isAuthenticated && canAccessStaff" :tabs="homeTabs" />

    <template v-if="!sessionStore.isAuthenticated">
      <header class="border-b border-border bg-surface">
        <div
          class="mx-auto grid max-w-[1024px] gap-6 px-6 py-8 max-[1000px]:px-4 min-[1201px]:grid-cols-[minmax(0,1fr)_17.1rem]"
        >
          <div class="flex flex-col gap-2">
            <h1 class="text-[2rem] font-semibold leading-[1.4] text-body">
              <span
                class="mr-3 inline-flex rounded-full border border-primary bg-primary-light px-3 py-1 align-middle text-xs font-bold text-primary"
              >
                PortalDots デモサイト
              </span>
              <span class="align-middle">{{ publicHome?.appName ?? "PortalDots" }}</span>
            </h1>
            <p class="max-w-[42rem] text-base leading-[1.7] text-body">
              {{
                publicHome?.portalDescription ||
                "デモサイトでは PortalDots のほぼ全機能をお試し利用することができます。"
              }}
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

      <div class="mx-auto max-w-[1024px] px-6 max-[1000px]:px-4">
        <ListPanel v-for="page in publicPinnedPages" :key="page.id" legacy overflow-hidden>
          <div class="border-b border-border px-6 py-[1.2rem] max-[1000px]:px-4">
            <h2 class="text-[1.333rem] font-semibold leading-[1.4] text-body">{{ page.title }}</h2>
            <div class="mt-px flex flex-wrap items-center gap-2 text-base text-muted">
              <span>{{ page.publishedAt }} 更新</span>
              <span
                v-if="page.isLimited"
                class="rounded-full border border-primary px-2.5 py-1 text-xs font-semibold text-primary"
              >
                限定公開
              </span>
            </div>
          </div>
          <div class="px-6 py-[1.2rem] max-[1000px]:px-4">
            <p class="whitespace-pre-wrap text-base leading-[1.7] text-body">{{ page.body }}</p>
          </div>
          <div
            v-if="page.documents.length > 0"
            class="border-t border-border px-6 py-[1.2rem] max-[1000px]:px-4"
          >
            <div class="flex flex-wrap gap-3">
              <a
                v-for="document in page.documents"
                :key="document.id"
                :href="buildApiUrl(document.downloadUrl)"
                class="inline-flex flex-wrap items-center gap-2 rounded-full border border-border bg-form-control px-3 py-2 text-sm text-body transition hover:bg-surface-light hover:no-underline"
                rel="noreferrer"
                target="_blank"
              >
                <i
                  v-if="document.isImportant"
                  class="fas fa-exclamation-circle fa-fw text-danger"
                  aria-hidden="true"
                />
                <i v-else class="far fa-file-alt fa-fw text-muted" aria-hidden="true" />
                <span>{{ document.name }}</span>
                <span class="text-xs text-muted">
                  ({{ document.extension || "FILE" }} • {{ formatFileSize(document.sizeBytes) }})
                </span>
              </a>
            </div>
          </div>
        </ListPanel>

        <ListPanel
          legacy
          title="ログイン方法"
          description="以下の 学生番号 / パスワードでデモサイトにログインできます。試しにログインして使ってみてください。"
        >
          <div v-if="publicHomeQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
            読み込み中...
          </div>
          <div v-else class="overflow-x-auto px-6 py-4">
            <table class="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th class="border-b border-border px-0 py-3 font-semibold text-body">
                    ユーザー種別
                  </th>
                  <th class="border-b border-border px-4 py-3 font-semibold text-body">学生番号</th>
                  <th class="border-b border-border px-0 py-3 font-semibold text-body">
                    パスワード
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="method in publicLoginMethods"
                  :key="`${method.roleLabel}-${method.loginId}`"
                >
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
            <p>
              PortalDots や PortalDots
              デモサイトに関するお問い合わせは以下のメールアドレスまでお送りください。
            </p>
            <p class="mt-2 text-muted">
              PortalDots デモサイト内の[お問い合わせ]からお問い合わせいただくことはできません。
            </p>
            <p class="mt-4 font-semibold text-body">
              {{ publicHome?.portalContactEmail ?? "support@portaldots.com" }}
            </p>
          </div>
        </ListPanel>

        <ListPanel v-if="publicParticipationTypes.length > 0" legacy title="企画参加登録">
          <div class="divide-y divide-border">
            <ListItemLink
              v-for="pt in publicParticipationTypes"
              :key="pt.id"
              legacy
              :to="`/register`"
            >
              <template #title>{{ pt.name }}</template>
              <template #meta>{{ pt.form.closeAt }} まで受付</template>
              {{ pt.description }}
            </ListItemLink>
          </div>
        </ListPanel>

        <ListPanel legacy title="お知らせ">
          <div v-if="publicHomeQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
            読み込み中...
          </div>
          <div v-else-if="publicPages.length === 0" class="px-6 py-6 text-sm text-muted">
            公開中のお知らせはありません。
          </div>
          <div v-else class="divide-y divide-border">
            <ListItemLink
              v-for="page in publicPages"
              :key="page.id"
              legacy
              :to="`/public/pages/${encodeURIComponent(page.id)}`"
            >
              <template #title>{{ page.title }}</template>
              <template #prefix>
                <span
                  :class="
                    page.isLimited
                      ? 'rounded-full border border-primary px-2.5 py-1 text-xs font-semibold text-primary'
                      : 'rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted'
                  "
                >
                  {{ page.isLimited ? "限定公開" : "全員に公開" }}
                </span>
              </template>
              <template #meta>{{ page.publishedAt }}</template>
              {{ page.summary }}
            </ListItemLink>
          </div>
          <RouterLink
            class="block border-t border-border px-6 py-6 text-center text-sm font-semibold text-primary transition hover:bg-form-control hover:no-underline"
            to="/public/pages"
          >
            他のお知らせを見る
          </RouterLink>
        </ListPanel>

        <ListPanel legacy title="最近の配布資料">
          <div v-if="publicHomeQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
            読み込み中...
          </div>
          <div v-else-if="publicDocuments.length === 0" class="px-6 py-6 text-sm text-muted">
            公開中の配布資料はありません。
          </div>
          <div v-else class="divide-y divide-border">
            <ListItemLink
              v-for="document in publicDocuments"
              :key="document.id"
              legacy
              :to="`/public/documents/${encodeURIComponent(document.id)}`"
            >
              <template #title>
                <i
                  v-if="document.isImportant"
                  class="fas fa-exclamation-circle fa-fw text-danger"
                  aria-hidden="true"
                />
                <i v-else class="far fa-file-alt fa-fw text-muted" aria-hidden="true" />
                {{ document.name }}
              </template>
              <template v-if="document.isNew" #suffix>
                <span
                  class="rounded-full bg-danger-light px-2 py-0.5 text-xs font-semibold text-danger"
                  >NEW</span
                >
              </template>
              <template #meta>
                {{ document.updatedAt }} 更新
                <br />
                {{ document.extension || "FILE" }} • {{ formatFileSize(document.sizeBytes) }}
              </template>
              {{ document.description }}
            </ListItemLink>
          </div>
          <RouterLink
            class="block border-t border-border px-6 py-6 text-center text-sm font-semibold text-primary transition hover:bg-form-control hover:no-underline"
            to="/public/documents"
          >
            他の配布資料を見る
          </RouterLink>
        </ListPanel>
      </div>
    </template>

    <!-- ログイン済みヘッダー -->
    <SurfaceCard v-else tag="header">
      <h2 class="text-2xl font-semibold text-body">PortalDots へようこそ</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <p class="rounded border border-primary px-4 py-3 text-sm text-primary">
          {{ sessionStore.user?.displayName }} としてログイン中です
        </p>
        <RouterLink
          class="rounded border border-border px-4 py-3 text-sm text-body transition hover:bg-surface-light"
          to="/workspace"
        >
          ワークスペースへ
        </RouterLink>
        <RouterLink
          v-if="canAccessStaff"
          class="rounded border border-primary px-4 py-3 text-sm text-primary transition hover:bg-primary-light"
          to="/staff"
        >
          スタッフ画面へ
        </RouterLink>
      </div>
    </SurfaceCard>

    <!-- 企画参加登録 -->
    <ListPanel
      v-if="
        sessionStore.isAuthenticated &&
        !hasSelectableCircles &&
        participationTypesWithForm.length > 0
      "
      title="企画参加登録"
    >
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="pt in participationTypesWithForm"
          :key="pt.id"
          :to="`/circles/new?participationTypeId=${encodeURIComponent(pt.id)}`"
        >
          <template #title>{{ pt.name }}</template>
          <template #meta>{{ pt.form.closeAt }} まで受付</template>
          <template v-if="pt.description" #default>{{ pt.description }}</template>
        </ListItemLink>
      </div>
    </ListPanel>

    <!-- 参加登録の状況 -->
    <ListPanel
      v-if="sessionStore.isAuthenticated && hasSelectableCircles"
      title="参加登録の状況"
      :description="
        sessionStore.currentCircle
          ? '現在の企画を切り替えられます。'
          : '次に作業する企画を選択してください。'
      "
    >
      <div class="divide-y divide-border">
        <button
          v-for="circle in circlesQuery.data.value"
          :key="circle.id"
          class="w-full px-6 py-5 text-left transition hover:bg-form-control disabled:opacity-60"
          :disabled="isSelectingCircle"
          type="button"
          @click="handleSelectCircle(circle.id)"
        >
          <p
            class="text-base font-semibold"
            :class="circle.id === sessionStore.currentCircle?.id ? 'text-primary' : 'text-body'"
          >
            {{ circle.name }}
            <span
              v-if="circle.id === sessionStore.currentCircle?.id"
              class="ml-2 text-xs font-normal"
            >
              （選択中）
            </span>
          </p>
          <p class="mt-2 text-sm text-muted">
            {{ circle.groupName }} / {{ circle.participationTypeName }}
          </p>
        </button>
      </div>
    </ListPanel>

    <!-- 企画情報 -->
    <ListPanel
      v-if="sessionStore.isAuthenticated && sessionStore.currentCircle"
      title="企画情報"
      description="現在選択中の企画コンテキストです。"
    >
      <div class="divide-y divide-border">
        <ListItemLink to="/workspace">
          <template #title>
            {{ selectedCircleSummary?.name }}
            <span
              v-if="circleDetailQuery.data.value?.nameYomi"
              class="text-sm font-normal text-muted"
            >
              （{{ circleDetailQuery.data.value.nameYomi }}）
            </span>
          </template>
          <template #meta>
            {{ selectedCircleSummary?.groupName
            }}<span v-if="circleDetailQuery.data.value?.groupNameYomi">
              （{{ circleDetailQuery.data.value.groupNameYomi }}）</span
            >
            / {{ selectedCircleSummary?.participationTypeName }}
          </template>
        </ListItemLink>
      </div>
      <RouterLink
        class="block border-t border-border px-6 py-4 text-sm text-primary transition hover:bg-form-control"
        to="/workspace"
      >
        より詳しい情報を見る
      </RouterLink>
    </ListPanel>

    <!-- お知らせ -->
    <ListPanel
      v-if="sessionStore.isAuthenticated && sessionStore.currentCircle"
      title="お知らせ"
      description="現在企画向けの最近のお知らせです。"
    >
      <div v-if="pagesQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>
      <div v-else-if="recentPages.length === 0" class="px-6 py-6 text-sm text-muted">
        公開中のお知らせはありません。
      </div>
      <div v-else class="divide-y divide-border">
        <ListItemLink
          v-for="page in recentPages"
          :key="page.id"
          :to="`/workspace/pages/${page.id}`"
        >
          <template #title>{{ page.title }}</template>
          <template #meta>{{ page.publishedAt }}</template>
        </ListItemLink>
      </div>
      <RouterLink
        class="block border-t border-border px-6 py-4 text-sm text-primary transition hover:bg-form-control"
        to="/workspace/pages"
      >
        他のお知らせを見る
      </RouterLink>
    </ListPanel>

    <!-- 最近の配布資料 -->
    <ListPanel
      v-if="sessionStore.isAuthenticated && sessionStore.currentCircle"
      title="最近の配布資料"
      description="現在企画向けの資料一覧です。"
    >
      <div v-if="documentsQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>
      <div v-else-if="recentDocuments.length === 0" class="px-6 py-6 text-sm text-muted">
        公開中の配布資料はありません。
      </div>
      <div v-else class="divide-y divide-border">
        <ListItemLink
          v-for="document in recentDocuments"
          :key="document.id"
          :href="buildApiUrl(document.downloadUrl)"
          new-tab
        >
          <template #title>
            <i
              v-if="document.isImportant"
              class="fas fa-exclamation-circle fa-fw text-danger"
              aria-hidden="true"
            />
            <i v-else class="far fa-file-alt fa-fw text-muted" aria-hidden="true" />
            {{ document.name }}
          </template>
          <template v-if="document.isNew" #suffix>
            <span
              class="rounded-full bg-danger-light px-2 py-0.5 text-xs font-semibold text-danger"
            >
              NEW
            </span>
          </template>
          <template #meta>
            {{ document.updatedAt }} 更新
            <br />
            {{ document.extension || "FILE" }}ファイル • {{ formatFileSize(document.sizeBytes) }}
          </template>
          {{ document.description }}
        </ListItemLink>
      </div>
      <RouterLink
        class="block border-t border-border px-6 py-4 text-sm text-primary transition hover:bg-form-control"
        to="/workspace/documents"
      >
        他の配布資料を見る
      </RouterLink>
    </ListPanel>

    <!-- 受付中の申請 -->
    <ListPanel
      v-if="sessionStore.isAuthenticated && sessionStore.currentCircle"
      title="受付中の申請"
      description="回答可能な申請の一部を表示しています。"
    >
      <div v-if="formsQuery.isPending.value" class="px-6 py-6 text-sm text-muted">
        読み込み中...
      </div>
      <div v-else-if="openForms.length === 0" class="px-6 py-6 text-sm text-muted">
        現在受付中の申請はありません。
      </div>
      <div v-else class="divide-y divide-border">
        <ListItemLink v-for="form in openForms" :key="form.id" :to="`/workspace/forms/${form.id}`">
          <template #title>{{ form.name }}</template>
          <template #meta>
            {{
              form.maxAnswers > 1
                ? `${form.closeAt} まで受付 / 1企画あたり ${form.maxAnswers} 件まで`
                : `${form.closeAt} まで受付`
            }}
          </template>
          {{ form.description }}
        </ListItemLink>
      </div>
      <RouterLink
        class="block border-t border-border px-6 py-4 text-sm text-primary transition hover:bg-form-control"
        to="/workspace/forms"
      >
        他の受付中の申請を見る
      </RouterLink>
    </ListPanel>

    <!-- 空コンテンツ状態 -->
    <SurfaceCard v-if="showEmptyState">
      <div class="px-6 py-12 text-center text-muted">
        <i class="fas fa-home fa-2x mb-4" aria-hidden="true" />
        <p class="text-sm">まだ公開コンテンツはありません</p>
      </div>
    </SurfaceCard>
  </section>
</template>
