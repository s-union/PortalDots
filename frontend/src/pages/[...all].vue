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

const isLegacyRegisterPath = computed(() => normalizedPath.value === "/register");
const isLegacyPasswordResetRequestPath = computed(() => normalizedPath.value === "/password/reset");
const legacyPasswordResetUserId = computed(() => {
  const match = normalizedPath.value.match(/^\/password\/reset\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
});
const isLegacyPasswordResetPath = computed(
  () => isLegacyPasswordResetRequestPath.value || legacyPasswordResetUserId.value !== null,
);

const legacyAuthPrimaryLink = computed(() => {
  if (legacyPasswordResetUserId.value !== null) {
    return "/password/reset";
  }
  return "/login";
});

const legacyAuthPrimaryLabel = computed(() => {
  if (legacyPasswordResetUserId.value !== null) {
    return "再設定方法の案内を見る";
  }
  return "ログイン画面へ戻る";
});

const legacyAuthLead = computed(() => {
  if (isLegacyRegisterPath.value) {
    return "旧 `/register` は移行中のため、この環境ではまだ新規ユーザー登録フォームを提供していません。";
  }

  if (legacyPasswordResetUserId.value !== null) {
    return "この URL は legacy の署名付きパスワード再設定リンクです。移行後の stack ではまだ再設定完了画面を提供していません。";
  }

  return "旧 `/password/reset` は移行中のため、現在の migrated stack ではメール送信付きの再設定開始フローをまだ提供していません。";
});

const legacyAuthBody = computed(() => {
  if (isLegacyRegisterPath.value) {
    return "既存アカウントをお持ちの場合はログインしてください。はじめて利用する方や招待を受けた方は、運営から案内された手順を利用してください。";
  }

  if (legacyPasswordResetUserId.value !== null) {
    return "ログイン可能であればワークスペースの設定画面からパスワードを変更できます。ログインできない場合は、運営へ再案内を依頼してください。";
  }

  return "ログイン済みならワークスペース設定からパスワード変更が可能です。ログインできない場合は、運営へ連絡して案内を確認してください。";
});

const legacyUserSettingsPaths = [
  "/user/edit",
  "/user/password",
  "/user/delete",
  "/user/appearance",
];
const isLegacyUserSettingsPath = computed(() =>
  legacyUserSettingsPaths.includes(normalizedPath.value),
);
const isLegacyCircleSelectorPath = computed(
  () => normalizedPath.value === "/selector" || normalizedPath.value === "/selector/set",
);
const isLegacyLogoutPath = computed(() => normalizedPath.value === "/logout");
const isLegacyContactPath = computed(() => normalizedPath.value === "/contacts");
const isLegacyCircleCreatePath = computed(() => normalizedPath.value === "/circles/create");
const isLegacyEmailVerifyNoticePath = computed(() => normalizedPath.value === "/email/verify");
const isLegacyEmailVerifyCompletedPath = computed(
  () => normalizedPath.value === "/email/verify/completed",
);
const legacyEmailVerifyAction = computed(() => {
  const match = normalizedPath.value.match(/^\/email\/verify\/([^/]+)\/([^/]+)$/);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    type: decodeURIComponent(match[1]),
    userId: decodeURIComponent(match[2]),
  };
});
const isLegacyEmailVerifyActionPath = computed(() => legacyEmailVerifyAction.value !== null);
const isLegacyEmailVerifyPath = computed(
  () =>
    isLegacyEmailVerifyNoticePath.value ||
    isLegacyEmailVerifyCompletedPath.value ||
    isLegacyEmailVerifyActionPath.value,
);

const legacyPrivateRouteTitle = computed(() => {
  if (isLegacyEmailVerifyPath.value) {
    return "メール認証導線は移行中です";
  }

  if (isLegacyContactPath.value) {
    return "お問い合わせ導線が移動しました";
  }

  if (isLegacyCircleCreatePath.value) {
    return "企画作成の導線が移動しました";
  }

  if (isLegacyCircleSelectorPath.value) {
    return "企画セレクターの導線が移動しました";
  }

  if (isLegacyUserSettingsPath.value) {
    return "ユーザー設定の導線が移動しました";
  }

  return "ログアウト導線が変わりました";
});

const legacyPrivateRouteLead = computed(() => {
  if (isLegacyEmailVerifyNoticePath.value) {
    return "旧 `/email/verify` は、legacy では確認メール再送と認証状況の確認に使っていた画面です。migrated stack ではまだ同等画面を提供していません。";
  }

  if (isLegacyEmailVerifyCompletedPath.value) {
    return "旧 `/email/verify/completed` は、legacy のメール認証完了画面です。移行後はこの完了表示をまだ再実装していません。";
  }

  if (isLegacyEmailVerifyActionPath.value) {
    return "この URL は legacy の署名付きメール認証リンクです。migrated stack では、このリンクをそのまま処理する画面をまだ提供していません。";
  }

  if (isLegacyContactPath.value) {
    return "旧 `/contacts` は、移行後はワークスペース配下のお問い合わせ画面へ移動しています。";
  }

  if (isLegacyCircleCreatePath.value) {
    return "旧 `/circles/create` は、移行後は新しい企画作成画面へ置き換えています。";
  }

  if (isLegacyCircleSelectorPath.value) {
    return "旧 `/selector` 系 URL は、移行後は企画選択画面へ統合されています。";
  }

  if (isLegacyUserSettingsPath.value) {
    return "旧 `/user/*` 系 URL で分かれていた表示名変更・テーマ設定・パスワード変更・退会導線は、移行後は 1 つの設定画面へ統合されています。";
  }

  return "旧 `/logout` の GET 導線は廃止し、移行後は画面右上やサイドバーのログアウト操作へ集約しています。";
});

const legacyPrivateRouteBody = computed(() => {
  if (isLegacyEmailVerifyNoticePath.value) {
    return "ログイン済みなら migrated ワークスペースで作業を継続し、必要に応じて運営へ確認してください。確認メールの再送や大学メール・連絡先メールの個別認証状態表示は未移行です。";
  }

  if (isLegacyEmailVerifyCompletedPath.value) {
    return "認証結果の反映確認は、ログイン後に利用できる画面で進めてください。完了表示だけを信頼させる導線は避け、現時点ではログイン導線を優先します。";
  }

  if (isLegacyEmailVerifyActionPath.value) {
    return `認証種別: ${legacyEmailVerifyAction.value?.type ?? "unknown"} / 対象ユーザー: ${legacyEmailVerifyAction.value?.userId ?? "unknown"}。ログインできる場合は migrated 画面から状況確認を進め、ログインできない場合は運営へ再案内を依頼してください。`;
  }

  if (isLegacyContactPath.value) {
    return "現在の企画コンテキスト付きで問い合わせカテゴリの選択、本文送信、送信履歴の確認ができます。";
  }

  if (isLegacyCircleCreatePath.value) {
    return "新しい企画を作成すると、そのまま企画責任者として migrated ワークスペースで編集を続けられます。";
  }

  if (isLegacyCircleSelectorPath.value) {
    return "企画を選び直すと、その後の migrated 画面も選択した企画コンテキストで動作します。`redirect` パラメーター互換はまだありません。";
  }

  if (isLegacyUserSettingsPath.value) {
    return "ワークスペースのユーザー設定では、表示名、外観、パスワード変更、アカウント削除をまとめて扱えます。";
  }

  return "ログアウト後はログイン画面へ戻ります。古いブックマークではなく、移行後アプリ内のボタン操作を利用してください。";
});

const legacyPrivateRoutePrimaryLink = computed(() => {
  if (isLegacyEmailVerifyNoticePath.value || isLegacyEmailVerifyCompletedPath.value) {
    return "/login";
  }

  if (isLegacyEmailVerifyActionPath.value) {
    return "/";
  }

  if (isLegacyContactPath.value) {
    return "/workspace/contact";
  }

  if (isLegacyCircleCreatePath.value) {
    return "/circles/new";
  }

  if (isLegacyCircleSelectorPath.value) {
    return "/circles/select";
  }

  if (isLegacyUserSettingsPath.value) {
    return "/workspace/settings";
  }

  return "/login";
});

const legacyPrivateRoutePrimaryLabel = computed(() => {
  if (isLegacyEmailVerifyNoticePath.value || isLegacyEmailVerifyCompletedPath.value) {
    return "ログイン画面へ";
  }

  if (isLegacyEmailVerifyActionPath.value) {
    return "ホームへ戻る";
  }

  if (isLegacyContactPath.value) {
    return "お問い合わせ画面へ";
  }

  if (isLegacyCircleCreatePath.value) {
    return "企画作成画面へ";
  }

  if (isLegacyCircleSelectorPath.value) {
    return "企画選択画面へ";
  }

  if (isLegacyUserSettingsPath.value) {
    return "ユーザー設定へ";
  }

  return "ログイン画面へ";
});

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

    <SurfaceCard v-else-if="isLegacyRegisterPath || isLegacyPasswordResetPath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">
          {{ isLegacyRegisterPath ? "認証導線は移行中です" : "パスワード再設定は移行中です" }}
        </h2>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>{{ legacyAuthLead }}</p>
        <p>{{ legacyAuthBody }}</p>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            :to="legacyAuthPrimaryLink"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            {{ legacyAuthPrimaryLabel }}
          </RouterLink>
          <RouterLink
            to="/"
            class="inline-flex rounded border border-border px-4 py-3 font-semibold text-body transition hover:bg-surface-light"
          >
            ホームへ戻る
          </RouterLink>
        </div>
        <p v-if="isLegacyPasswordResetPath" class="text-muted">
          ログイン済みなら、ワークスペース内の設定画面から現在のパスワードを変更できます。
        </p>
      </div>
    </SurfaceCard>

    <SurfaceCard
      v-else-if="
        isLegacyCircleSelectorPath ||
        isLegacyUserSettingsPath ||
        isLegacyLogoutPath ||
        isLegacyEmailVerifyPath ||
        isLegacyContactPath ||
        isLegacyCircleCreatePath
      "
    >
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">{{ legacyPrivateRouteTitle }}</h2>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>{{ legacyPrivateRouteLead }}</p>
        <p>{{ legacyPrivateRouteBody }}</p>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            :to="legacyPrivateRoutePrimaryLink"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            {{ legacyPrivateRoutePrimaryLabel }}
          </RouterLink>
          <RouterLink
            to="/workspace"
            class="inline-flex rounded border border-border px-4 py-3 font-semibold text-body transition hover:bg-surface-light"
          >
            ワークスペースへ
          </RouterLink>
        </div>
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
