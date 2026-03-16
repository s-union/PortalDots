<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  buildCircleSelectorLocation,
  sanitizeCircleSelectorCircleId,
  sanitizeCircleSelectorRedirect,
} from "@/app/router/circleSelectorRedirect";
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { buildApiUrl, encodePathSegment } from "@/lib/api/client";
import privacyPolicyMarkdown from "../../../resources/md/privacy_policy.md?raw";

const route = useRoute("/[...all]");
const router = useRouter();

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
const legacyFormsStatus = computed(() => {
  if (normalizedPath.value === "/forms/closed") {
    return "closed";
  }

  if (normalizedPath.value === "/forms/all") {
    return "all";
  }

  if (normalizedPath.value === "/forms") {
    return "open";
  }

  return null;
});
const legacyFormAnswerRoute = computed(() => {
  const createMatch = normalizedPath.value.match(/^\/forms\/([^/]+)\/answers\/create$/);
  if (createMatch?.[1]) {
    const formId = decodeURIComponent(createMatch[1]);
    return {
      type: "create" as const,
      formId,
      target: `/workspace/forms/${encodeURIComponent(formId)}`,
      targetLabel: "この申請を開く",
    };
  }

  const editMatch = normalizedPath.value.match(/^\/forms\/([^/]+)\/answers\/([^/]+)\/edit$/);
  if (editMatch?.[1] && editMatch[2]) {
    const formId = decodeURIComponent(editMatch[1]);
    const answerId = decodeURIComponent(editMatch[2]);
    return {
      type: "edit" as const,
      formId,
      answerId,
      target: `/workspace/forms/${encodeURIComponent(formId)}?answer=${encodeURIComponent(answerId)}`,
      targetLabel: "この回答を開く",
    };
  }

  const uploadMatch = normalizedPath.value.match(
    /^\/forms\/([^/]+)\/answers\/([^/]+)\/uploads\/([^/]+)$/,
  );
  if (uploadMatch?.[1] && uploadMatch[2] && uploadMatch[3]) {
    const formId = decodeURIComponent(uploadMatch[1]);
    const answerId = decodeURIComponent(uploadMatch[2]);
    const questionId = decodeURIComponent(uploadMatch[3]);
    return {
      type: "upload" as const,
      formId,
      answerId,
      questionId,
      target: `/workspace/forms/${encodeURIComponent(formId)}?answer=${encodeURIComponent(answerId)}`,
      downloadUrl: buildApiUrl(
        `/forms/${encodePathSegment(formId)}/answers/${encodePathSegment(answerId)}/uploads/${encodePathSegment(questionId)}/file`,
      ),
      targetLabel: "回答画面へ",
    };
  }

  return null;
});
const isLegacyFormsPath = computed(() => legacyFormsStatus.value !== null);
const isLegacyFormAnswerRoutePath = computed(() => legacyFormAnswerRoute.value !== null);
const workspaceFormsLink = computed(() => {
  if (legacyFormsStatus.value === "closed") {
    return "/workspace/forms?status=closed";
  }

  if (legacyFormsStatus.value === "all") {
    return "/workspace/forms?status=all";
  }

  return "/workspace/forms";
});

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
const legacyCircleSelectorRedirect = computed(() => {
  const redirectTo = route.query.redirect_to;
  if (typeof redirectTo === "string") {
    return sanitizeCircleSelectorRedirect(redirectTo);
  }

  const redirect = route.query.redirect;
  if (typeof redirect === "string") {
    return sanitizeCircleSelectorRedirect(redirect);
  }

  return null;
});
const legacyCircleSelectorCircleId = computed(() => {
  const circle = route.query.circle;
  return sanitizeCircleSelectorCircleId(typeof circle === "string" ? circle : undefined);
});
const isLegacyLogoutPath = computed(() => normalizedPath.value === "/logout");
const isLegacyContactPath = computed(() => normalizedPath.value === "/contacts");
const isLegacyCircleCreatePath = computed(() => normalizedPath.value === "/circles/create");
const legacyCircleCreateParticipationTypeId = computed(() => {
  const participationType = route.query.participation_type;
  return typeof participationType === "string" ? participationType : null;
});
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
const legacyCircleRoute = computed(() => {
  const match = normalizedPath.value.match(/^\/circles\/([^/]+)(?:\/([^/]+))?$/);
  if (!match?.[1]) {
    return null;
  }

  const circleId = decodeURIComponent(match[1]);
  const action = match[2] ? decodeURIComponent(match[2]) : null;

  if (["new", "select", "create", "join"].includes(circleId)) {
    return null;
  }

  if (action === null || ["auth", "edit", "confirm", "done", "delete"].includes(action)) {
    const body =
      action === "auth"
        ? `legacy の企画 ID: ${circleId} を含む認証付きブックマークです。migrated stack では個別の認証画面を出さず、現在選択中の企画情報画面からアクセス可否を確認します。必要なら企画責任者に共有された最新の導線を確認してください。`
        : `legacy の企画 ID: ${circleId} を含むブックマークです。企画の編集、提出状況の確認、提出後の作業、削除導線は migrated の企画情報画面へ統合されています。`;

    return {
      circleId,
      target: "/workspace/circles/detail",
      targetLabel: "企画情報画面へ",
      title: "企画情報の導線が移動しました",
      lead:
        action === "auth"
          ? "旧 `/circles/:circle/auth` は、legacy では企画ごとの認証画面でした。移行後は現在選択中の企画情報画面で状況を確認します。"
          : "旧 `/circles/:circle` 系 URL は、移行後は現在選択中の企画情報画面で確認します。",
      body,
    };
  }

  if (action === "users") {
    return {
      circleId,
      target: "/workspace/circles/members",
      targetLabel: "メンバー管理画面へ",
      title: "メンバー管理の導線が移動しました",
      lead: "旧 `/circles/:circle/users` は、移行後は現在選択中の企画のメンバー管理画面で扱います。",
      body: `legacy の企画 ID: ${circleId} を含むブックマークです。招待リンクの確認、再生成、所属メンバーの確認と削除は migrated のメンバー管理画面へ集約しています。`,
    };
  }

  return null;
});
const legacyCircleInviteRoute = computed(() => {
  const match = normalizedPath.value.match(/^\/circles\/([^/]+)\/users\/invite\/([^/]+)$/);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const circleId = decodeURIComponent(match[1]);
  const token = decodeURIComponent(match[2]);

  return {
    circleId,
    token,
    target: `/circles/join/${encodeURIComponent(token)}`,
  };
});
const isLegacyCircleRoutePath = computed(() => legacyCircleRoute.value !== null);
const isLegacyCircleInviteRoutePath = computed(() => legacyCircleInviteRoute.value !== null);

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
    return legacyCircleCreateParticipationTypeId.value
      ? `新しい企画作成画面へ移動し、legacy で指定されていた参加種別 ${legacyCircleCreateParticipationTypeId.value} を引き継ぎます。`
      : "新しい企画を作成すると、そのまま企画責任者として migrated ワークスペースで編集を続けられます。";
  }

  if (isLegacyCircleSelectorPath.value) {
    return legacyCircleSelectorRedirect.value
      ? legacyCircleSelectorCircleId.value
        ? `企画を選び直すと、指定された企画 ${legacyCircleSelectorCircleId.value} を優先して ${legacyCircleSelectorRedirect.value} へ戻ります。`
        : `企画を選び直すと、その後は ${legacyCircleSelectorRedirect.value} へ戻って作業を続けられます。`
      : "企画を選び直すと、その後の migrated 画面も選択した企画コンテキストで動作します。";
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
    if (legacyCircleCreateParticipationTypeId.value) {
      return {
        path: "/circles/new",
        query: { participation_type: legacyCircleCreateParticipationTypeId.value },
      };
    }

    return "/circles/new";
  }

  if (isLegacyCircleSelectorPath.value) {
    const selectorLocation = buildCircleSelectorLocation(
      legacyCircleSelectorRedirect.value ?? undefined,
      legacyCircleSelectorCircleId.value ?? undefined,
    );
    return typeof selectorLocation === "string" ? selectorLocation : selectorLocation;
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

watch(
  [normalizedPath, legacyCircleSelectorRedirect, legacyCircleSelectorCircleId],
  async ([path, redirect, circleId]) => {
    if (path !== "/selector/set") {
      return;
    }

    await router.replace(buildCircleSelectorLocation(redirect ?? undefined, circleId ?? undefined));
  },
  { immediate: true },
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

    <SurfaceCard v-else-if="isLegacyFormsPath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">申請一覧の導線が移動しました</h2>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>旧 `/forms` 系 URL は、移行後はワークスペース配下の申請画面で確認します。</p>
        <p>
          {{
            legacyFormsStatus === "closed"
              ? "受付終了タブを開きます。"
              : legacyFormsStatus === "all"
                ? "全てタブを開きます。"
                : "受付中タブを開きます。"
          }}
        </p>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            :to="workspaceFormsLink"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            申請一覧へ
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

    <SurfaceCard v-else-if="isLegacyFormAnswerRoutePath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">申請回答の導線が移動しました</h2>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p v-if="legacyFormAnswerRoute?.type === 'create'">
          旧 `/forms/:form/answers/create`
          は、移行後は回答作成を含む申請詳細画面へ統合されています。
        </p>
        <p v-else-if="legacyFormAnswerRoute?.type === 'edit'">
          旧 `/forms/:form/answers/:answer/edit` は、移行後は回答 ID
          を指定した申請詳細画面で編集します。
        </p>
        <p v-else>
          旧 `/forms/:form/answers/:answer/uploads/:question`
          は、移行後も回答画面とアップロードファイル導線で確認できます。
        </p>
        <p>
          form ID: {{ legacyFormAnswerRoute?.formId }}
          <span v-if="legacyFormAnswerRoute?.type !== 'create'">
            / answer ID: {{ legacyFormAnswerRoute?.answerId }}
          </span>
          <span v-if="legacyFormAnswerRoute?.type === 'upload'">
            / question ID: {{ legacyFormAnswerRoute?.questionId }}
          </span>
        </p>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            :to="legacyFormAnswerRoute?.target ?? '/workspace/forms'"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            {{ legacyFormAnswerRoute?.targetLabel }}
          </RouterLink>
          <a
            v-if="legacyFormAnswerRoute?.type === 'upload'"
            :href="legacyFormAnswerRoute.downloadUrl"
            class="inline-flex rounded border border-border px-4 py-3 font-semibold text-body transition hover:bg-surface-light"
          >
            添付ファイルを直接開く
          </a>
        </div>
        <p class="text-muted">
          ログイン済みかつ企画選択済みなら、そのまま migrated の申請画面で作業を続けられます。
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

    <SurfaceCard v-else-if="isLegacyCircleInviteRoutePath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">招待受け入れの導線が移動しました</h2>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>
          旧 `/circles/:circle/users/invite/:token` は、移行後は招待受け入れ画面へ移動しています。
        </p>
        <p>
          legacy の企画 ID: {{ legacyCircleInviteRoute?.circleId }} / 招待トークン:
          {{ legacyCircleInviteRoute?.token }}
        </p>
        <p>ログイン済みなら、そのまま migrated の招待受け入れ画面で参加処理を続けられます。</p>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            :to="legacyCircleInviteRoute?.target ?? '/circles/select'"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            招待受け入れ画面へ
          </RouterLink>
          <RouterLink
            to="/circles/select"
            class="inline-flex rounded border border-border px-4 py-3 font-semibold text-body transition hover:bg-surface-light"
          >
            企画選択へ
          </RouterLink>
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard v-else-if="isLegacyCircleRoutePath">
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Legacy Route</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">{{ legacyCircleRoute?.title }}</h2>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>{{ legacyCircleRoute?.lead }}</p>
        <p>{{ legacyCircleRoute?.body }}</p>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            :to="legacyCircleRoute?.target ?? '/workspace'"
            class="inline-flex rounded bg-primary px-4 py-3 font-bold text-white transition hover:bg-primary-hover"
          >
            {{ legacyCircleRoute?.targetLabel }}
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
