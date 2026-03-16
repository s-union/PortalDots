<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
  },
});

import AuthRouteNotice from "@/components/auth/AuthRouteNotice.vue";

const resetNotes = [
  "legacy では学籍番号または連絡先メールアドレスを入力し、再設定メールを受け取る流れでした。",
  "migrated stack では再設定メール送信 API と完了画面をまだ提供していません。",
];

const actions = [
  { label: "ログイン画面へ", to: "/login", variant: "primary" as const },
  { label: "ホームへ戻る", to: "/" },
];
</script>

<template>
  <AuthRouteNotice
    body="ログインできる場合は、ワークスペースの設定画面からパスワードを変更できます。ログインできない場合は、運営へ再設定案内の再送を依頼してください。"
    :actions="actions"
    lead="legacy の `/password/reset` で行っていた再設定メール送信フローは、移行後の stack ではまだ実装していません。"
    :notes="resetNotes"
    title="パスワード再設定は移行中です"
  />
</template>
