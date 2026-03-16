<script setup lang="ts">
import { computed } from "vue";
import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { buildApiUrl } from "@/lib/api/client";
import { formatFileSize } from "@/lib/format/fileSize";
import { useDocumentsPageQuery } from "@/features/documents/api";
import { useFormsQuery } from "@/features/forms/api";
import { usePagesQuery } from "@/features/pages/api";
import { hasStaffAccess } from "@/features/staff/access/capabilities";
import { useSelectableCirclesQuery, useSelectCurrentCircleMutation } from "@/features/circles/api";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();
const circlesQuery = useSelectableCirclesQuery();
const selectCircleMutation = useSelectCurrentCircleMutation();
const pagesQuery = usePagesQuery(computed(() => ""));
const documentsQuery = useDocumentsPageQuery(
  computed(() => ({
    page: 1,
    pageSize: 3,
  })),
);
const formsQuery = useFormsQuery();

const canAccessStaff = computed(() => hasStaffAccess(sessionStore.roles, sessionStore.permissions));
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

async function handleSelectCircle(circleId: string) {
  await selectCircleMutation.mutateAsync(circleId);
}
</script>

<template>
  <section class="space-y-6">
    <SurfaceCard tag="header">
      <h2 class="text-2xl font-semibold text-body">PortalDots へようこそ</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <RouterLink
          v-if="!sessionStore.isAuthenticated"
          class="rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          to="/login"
        >
          ログイン画面へ
        </RouterLink>
        <RouterLink
          v-if="!sessionStore.isAuthenticated"
          class="rounded border border-border px-4 py-3 text-sm text-body transition hover:bg-surface-light"
          to="/register"
        >
          新規ユーザー登録
        </RouterLink>
        <p v-else class="rounded border border-primary px-4 py-3 text-sm text-primary">
          {{ sessionStore.user?.displayName }} としてログイン中です
        </p>
        <RouterLink
          v-if="sessionStore.isAuthenticated"
          class="rounded border border-border px-4 py-3 text-sm text-body transition hover:bg-surface-light"
          to="/workspace"
        >
          ワークスペースへ
        </RouterLink>
        <RouterLink
          v-if="sessionStore.isAuthenticated && canAccessStaff"
          class="rounded border border-primary px-4 py-3 text-sm text-primary transition hover:bg-primary-light"
          to="/staff"
        >
          スタッフ画面へ
        </RouterLink>
      </div>
    </SurfaceCard>

    <ListPanel
      v-if="sessionStore.isAuthenticated && selectedCircleSummary"
      title="企画情報"
      description="現在選択中の企画コンテキストです。"
    >
      <div class="divide-y divide-border">
        <ListItemLink to="/workspace">
          <template #title>{{ selectedCircleSummary.name }}</template>
          <template #meta>
            {{ selectedCircleSummary.groupName }} /
            {{ selectedCircleSummary.participationTypeName }}
          </template>
          ワークスペースと各種公開情報へ移動できます。
        </ListItemLink>
      </div>
    </ListPanel>

    <ListPanel
      v-if="sessionStore.isAuthenticated && hasSelectableCircles"
      title="企画コンテキスト"
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
          <p class="text-base font-semibold text-body">{{ circle.name }}</p>
          <p class="mt-2 text-sm text-muted">
            {{ circle.groupName }} / {{ circle.participationTypeName }}
          </p>
        </button>
      </div>
    </ListPanel>

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
    </ListPanel>

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
            <span v-if="document.isImportant" class="mr-1 text-danger">!</span>
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
    </ListPanel>

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
    </ListPanel>
  </section>
</template>
