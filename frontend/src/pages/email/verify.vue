<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    noDrawer: true,
    noBottomTabs: true,
  },
});

import { computed } from "vue";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();

const verifyLabel = computed(
  () => `${sessionStore.user?.displayName ?? "ログイン中ユーザー"}としてログイン中`,
);
</script>

<template>
  <section class="mx-auto w-full max-w-[880px] space-y-6 px-6 py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">
          まだユーザー登録は完了していません！
        </h1>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>
          メール認証の旧フローは未移植です。ログイン中の状態を維持したまま、必要に応じて運営へ確認してください。
        </p>
        <p class="font-semibold">{{ verifyLabel }}</p>
      </div>
    </section>

    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h2 class="text-[1.333rem] font-semibold leading-[1.4] text-body">
          誤った情報で登録してしまった場合
        </h2>
      </div>
      <div class="divide-y divide-border">
        <RouterLink
          class="block px-6 py-4 text-primary hover:bg-form-control hover:no-underline"
          to="/workspace/settings"
        >
          登録情報の変更
        </RouterLink>
        <RouterLink
          class="block px-6 py-4 text-primary hover:bg-form-control hover:no-underline"
          to="/workspace/settings/password"
        >
          パスワードの変更
        </RouterLink>
      </div>
    </section>
  </section>
</template>
