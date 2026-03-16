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

const completedNotes: string[] = [];
</script>

<template>
  <AuthRouteNotice
    body="認証結果の最終確認は、ログイン後の画面から進めてください。メール設計は未確定のため、この完了画面もモック前提の案内として残しています。"
    :actions="actions"
    lead="メール認証完了の旧 Laravel URL は移植せず、現在はログイン後導線へ案内します。"
    :notes="completedNotes"
    title="メール認証の完了案内"
  />
</template>
