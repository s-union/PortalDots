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
const userId = computed(() => {
  const value = routeParams.value.userId;
  return typeof value === "string" ? value : "";
});

const actions = [
  { label: "再設定方法の案内を見る", to: "/password/reset", variant: "primary" as const },
  { label: "ログイン画面へ", to: "/login" },
];

const resetNotes = computed(() => [
  `legacy の対象ユーザー ID: ${userId.value || "unknown"}`,
  "署名付きリンクの直接処理はまだ migrated stack へ移していません。",
]);
</script>

<template>
  <AuthRouteNotice
    body="ログイン可能であればワークスペース設定からパスワードを変更できます。ログインできない場合は、運営へ再案内を依頼してください。"
    :actions="actions"
    lead="この URL は legacy の署名付きパスワード再設定リンクです。移行後の stack では、再設定完了フローをまだ提供していません。"
    :notes="resetNotes"
    title="署名付きパスワード再設定リンクです"
  />
</template>
