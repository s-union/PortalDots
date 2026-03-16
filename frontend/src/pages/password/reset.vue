<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
  },
});

import AuthRouteNotice from "@/components/auth/AuthRouteNotice.vue";

const resetNotes: string[] = [];

const actions = [
  { label: "ログイン画面へ", to: "/login", variant: "primary" as const },
  { label: "ホームへ戻る", to: "/" },
];
</script>

<template>
  <AuthRouteNotice
    body="ログインできる場合は、ワークスペースの設定画面からパスワードを変更できます。ログインできない場合は、運営へ再設定案内の再送を依頼してください。メール設計は未確定のため、この画面から本番メール送信は行いません。"
    :actions="actions"
    lead="パスワード再設定の旧 Laravel URL は移植せず、現在はモック前提の案内だけを表示します。"
    :notes="resetNotes"
    title="パスワード再設定"
  />
</template>
