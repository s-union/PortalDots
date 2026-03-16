<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
  },
});

import { computed } from "vue";
import AuthRouteNotice from "@/components/auth/AuthRouteNotice.vue";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();

const verifyNotes = computed(() => [
  `${sessionStore.user?.displayName ?? "ログイン中ユーザー"} として確認しています。`,
  "legacy にあった確認メール再送、大学メールと連絡先メールの個別認証状態表示はまだ未移行です。",
]);

const actions = [
  { label: "ユーザー設定へ", to: "/workspace/settings", variant: "primary" as const },
  { label: "ホームへ戻る", to: "/" },
];
</script>

<template>
  <AuthRouteNotice
    body="現在はログイン済みセッションを維持したまま作業を続け、必要に応じて運営へ確認してください。認証状態の詳細表示や再送機能は、backend API の準備後に段階的に移します。"
    :actions="actions"
    lead="legacy の `/email/verify` で行っていたメール認証状態の確認と再送は、移行後の stack ではまだ一部のみ対応しています。"
    :notes="verifyNotes"
    title="メール認証は段階移行中です"
  />
</template>
