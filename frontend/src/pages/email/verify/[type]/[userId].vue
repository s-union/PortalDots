<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true,
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
    body="ログインできる場合はログイン後の設定画面から状態を確認してください。ログインできない場合は、運営へ最新の認証案内を確認してください。署名付きメール経由の旧フローは移植していません。"
    :actions="actions"
    lead="この旧 Laravel URL は利用せず、現在はモック前提の案内のみ提供しています。"
    :notes="verifyNotes"
    title="署名付きメール認証リンクです"
  />
</template>
