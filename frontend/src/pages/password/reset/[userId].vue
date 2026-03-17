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
const userId = computed(() => {
  const value = routeParams.value.userId;
  return typeof value === "string" ? value : "";
});

const actions = [
  { label: "再設定方法の案内を見る", to: "/password/reset", variant: "primary" as const },
  { label: "ログイン画面へ", to: "/login" },
];

const resetNotes = computed(() => [] as string[]);
</script>

<template>
  <AuthRouteNotice
    body="ログイン可能であればワークスペース設定からパスワードを変更できます。ログインできない場合は、運営へ再案内を依頼してください。署名付きメール経由の旧フローは移植していません。"
    :actions="actions"
    lead="この旧 Laravel URL は利用せず、現在はモック前提の案内のみ提供しています。"
    :notes="resetNotes"
    title="署名付きパスワード再設定リンクです"
  />
</template>
