<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { buildApiUrl, encodePathSegment } from "@/lib/api/client";
import privacyPolicyMarkdown from "../../../resources/md/privacy_policy.md?raw";

const route = useRoute("/[...all]");

const normalizedPath = computed(() => {
  const path = route.path.replace(/\/+$/, "");
  return path === "" ? "/" : path;
});

const supportBrowsers = [
  "Microsoft Edge 最新版",
  "Mozilla Firefox 最新版",
  "Google Chrome 最新版",
  "Safari 最新版",
];

const legacyPageId = computed(() => {
  const match = normalizedPath.value.match(/^\/pages\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
});

const legacyDocumentId = computed(() => {
  const match = normalizedPath.value.match(/^\/documents\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
});

const workspacePageLink = computed(() =>
  legacyPageId.value
    ? `/workspace/pages/${encodeURIComponent(legacyPageId.value)}`
    : "/workspace/pages",
);

const workspaceDocumentsLink = "/workspace/documents";

const legacyDocumentDownloadUrl = computed(() =>
  legacyDocumentId.value
    ? buildApiUrl(`/documents/${encodePathSegment(legacyDocumentId.value)}`)
    : null,
);

const isSupportPath = computed(() => normalizedPath.value === "/support");
const isPrivacyPolicyPath = computed(() => normalizedPath.value === "/privacy_policy");
const isLegacyPagesPath = computed(
  () => normalizedPath.value === "/pages" || legacyPageId.value !== null,
);
const isLegacyDocumentsPath = computed(
  () => normalizedPath.value === "/documents" || legacyDocumentId.value !== null,
);
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/"> ホームへ戻る </BackLink>

    <SurfaceCard v-if="isSupportPath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">ブラウザ環境について</h2>
      </div>
      <div class="space-y-5 px-6 py-6 text-sm leading-7 text-body">
        <p>旧 `/support` 導線は移行中のため、この画面で推奨動作環境を案内しています。</p>
        <ul class="list-disc space-y-2 pl-6">
          <li v-for="browser in supportBrowsers" :key="browser">{{ browser }}</li>
        </ul>
        <p>
          推奨環境以外で利用された場合や、ブラウザ設定によっては正しく表示されないことがあります。問題が起きる場合は最新版ブラウザへの更新をお試しください。
        </p>
      </div>
    </SurfaceCard>

    <SurfaceCard v-else-if="isPrivacyPolicyPath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">プライバシーポリシー</h2>
      </div>
      <div class="px-6 py-6">
        <p class="whitespace-pre-wrap text-sm leading-7 text-body">{{ privacyPolicyMarkdown }}</p>
      </div>
    </SurfaceCard>

    <SurfaceCard v-else-if="isLegacyPagesPath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">お知らせの導線が移動しました</h2>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>旧 `/pages` 系 URL は、移行後はワークスペース配下のお知らせ画面で確認します。</p>
        <RouterLink
          :to="workspacePageLink"
          class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
        >
          {{ legacyPageId ? "このお知らせを開く" : "お知らせ一覧へ" }}
        </RouterLink>
        <p class="text-muted">ログイン後に企画を選択していれば、そのまま移行先画面へ進めます。</p>
      </div>
    </SurfaceCard>

    <SurfaceCard v-else-if="isLegacyDocumentsPath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">配布資料の導線が移動しました</h2>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>旧 `/documents` 系 URL は、移行後はワークスペース配下の配布資料画面で確認します。</p>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            :to="workspaceDocumentsLink"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            配布資料一覧へ
          </RouterLink>
          <a
            v-if="legacyDocumentDownloadUrl"
            :href="legacyDocumentDownloadUrl"
            class="inline-flex rounded border border-border px-4 py-3 font-semibold text-body transition hover:bg-surface-light"
          >
            この資料を直接開く
          </a>
        </div>
        <p class="text-muted">
          ログイン済みかつ企画選択済みなら、直接ダウンロード導線もそのまま使えます。
        </p>
      </div>
    </SurfaceCard>

    <SurfaceCard v-else>
      <div class="px-6 py-8">
        <p class="text-sm text-primary">404</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">ページが見つかりません</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          指定された URL に対応する画面はまだ移行されていないか、存在しません。
        </p>
      </div>
    </SurfaceCard>
  </section>
</template>
