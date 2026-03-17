<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    noDrawer: true,
    noBottomTabs: true,
  },
});

import { computed } from "vue";
import AuthRouteNotice from "@/components/auth/AuthRouteNotice.vue";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();

const verifyNotes = computed(() => [
  `${sessionStore.user?.displayName ?? "ログイン中ユーザー"} として確認しています。`,
]);

const actions = [
  { label: "ユーザー設定へ", to: "/workspace/settings", variant: "primary" as const },
  { label: "ホームへ戻る", to: "/" },
];
</script>

<template>
  <AuthRouteNotice
    body="現在はログイン済みセッションを維持したまま作業を続け、必要に応じて運営へ確認してください。メール設計は未確定のため、認証状態の詳細表示や再送機能はモック前提の案内に留めています。"
    :actions="actions"
    lead="メール認証の旧 Laravel URL は移植せず、現在はモック前提の案内のみ表示します。"
    :notes="verifyNotes"
    title="メール認証"
  />
</template>
