<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
  },
});

import { computed } from "vue";
import { useRoute } from "vue-router";
import AuthRouteNotice from "@/components/auth/AuthRouteNotice.vue";

const route = useRoute();
const routeParams = computed(() => route.params as Record<string, string | string[] | undefined>);
const verifyType = computed(() => {
  const value = routeParams.value.type;
  return typeof value === "string" ? value : "unknown";
});
const userId = computed(() => {
  const value = routeParams.value.userId;
  return typeof value === "string" ? value : "unknown";
});

const actions = [
  { label: "ホームへ戻る", to: "/", variant: "primary" as const },
  { label: "ログイン画面へ", to: "/login" },
];

const verifyNotes = computed(() => [
  `認証種別: ${verifyType.value}`,
  `対象ユーザー: ${userId.value}`,
]);
</script>

<template>
  <AuthRouteNotice
    body="ログインできる場合は migrated 画面から状態を確認してください。ログインできない場合は、運営へ最新の認証案内を確認してください。"
    :actions="actions"
    lead="この URL は legacy の署名付きメール認証リンクです。移行後の stack では、リンクを直接処理する backend API をまだ用意していません。"
    :notes="verifyNotes"
    title="署名付きメール認証リンクです"
  />
</template>
