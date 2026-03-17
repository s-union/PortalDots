<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true,
  },
});

import AuthRouteNotice from "@/components/auth/AuthRouteNotice.vue";

const registrationNotes = ["アカウント作成は、運営から案内された手順で進めてください。"];

const actions = [
  { label: "ログイン画面へ", to: "/login", variant: "primary" as const },
  { label: "ホームへ戻る", to: "/" },
];
</script>

<template>
  <AuthRouteNotice
    body="既存アカウントを持っている場合はログインしてください。初回利用の方は、運営から案内された手順でアカウント作成または招待受け入れを進めてください。メール設計は未確定のため、この画面単体では本登録フローを提供していません。"
    :actions="actions"
    lead="ユーザー登録は旧 Laravel URL を移植せず、現在は案内ベースで運用しています。"
    :notes="registrationNotes"
    title="ユーザー登録"
  />
</template>
