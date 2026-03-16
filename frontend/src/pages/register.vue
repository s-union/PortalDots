<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
  },
});

import AuthRouteNotice from "@/components/auth/AuthRouteNotice.vue";

const registrationNotes = [
  "legacy では学籍番号または大学メール、氏名、連絡先メール、電話番号、パスワードをまとめて登録していました。",
  "新しい stack では自己登録フォームをまだ backend API 化していないため、運営案内または招待導線から利用開始してください。",
];

const actions = [
  { label: "ログイン画面へ", to: "/login", variant: "primary" as const },
  { label: "ホームへ戻る", to: "/" },
];
</script>

<template>
  <AuthRouteNotice
    body="既存アカウントを持っている場合はログインしてください。初回利用の方は、運営から案内された手順でアカウント作成または招待受け入れを進めてください。"
    :actions="actions"
    lead="legacy の `/register` で行っていたユーザー自己登録は、移行後の stack ではまだ提供していません。"
    :notes="registrationNotes"
    title="ユーザー登録は移行中です"
  />
</template>
