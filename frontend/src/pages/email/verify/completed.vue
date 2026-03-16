<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
  },
});

import AuthRouteNotice from "@/components/auth/AuthRouteNotice.vue";

const actions = [
  { label: "ホームへ戻る", to: "/", variant: "primary" as const },
  { label: "ワークスペースへ", to: "/workspace" },
];

const completedNotes = [
  "legacy の完了画面にあった一時的な成功表示は、この migrated 画面では簡潔な案内に置き換えています。",
];
</script>

<template>
  <AuthRouteNotice
    body="認証結果の最終確認は、ログイン後に利用できる migrated 画面から進めてください。表示専用の完了画面に依存しない導線へ整理しています。"
    :actions="actions"
    lead="legacy の `/email/verify/completed` は認証完了メッセージ専用の画面でした。移行後は、完了後の次の操作へ進みやすい案内に置き換えています。"
    :notes="completedNotes"
    title="メール認証の完了案内"
  />
</template>
