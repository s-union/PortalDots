<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true,
  },
});

import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();

const quickLinks = [
  {
    to: "/workspace/circles/detail",
    label: "企画情報を管理",
    description: "企画名・団体名の編集や参加登録の提出を行います。",
  },
  {
    to: "/workspace/circles/members",
    label: "メンバーを管理",
    description: "招待リンクの確認やメンバーの管理を行います。",
  },
  {
    to: "/workspace/pages",
    label: "お知らせを見る",
    description: "公開されているお知らせを確認します。",
  },
  {
    to: "/workspace/documents",
    label: "配布資料を見る",
    description: "配布資料を一覧で確認します。",
  },
  {
    to: "/workspace/forms",
    label: "申請を見る",
    description: "提出可能な申請フォームを確認します。",
  },
  {
    to: "/workspace/contact",
    label: "お問い合わせ",
    description: "問い合わせ前提情報と窓口案内を確認します。",
  },
  {
    to: "/workspace/settings",
    label: "ユーザー設定",
    description: "ログイン中のアカウント情報を確認します。",
  },
];
</script>

<template>
  <section class="space-y-6">
    <section class="rounded border border-primary bg-primary-light shadow-lv1">
      <div class="border-b border-primary/30 px-6 py-5">
        <h2 class="text-2xl font-semibold text-body">現在の企画コンテキストで作業します。</h2>
        <p class="mt-2 text-sm text-muted">
          認証済みかつ企画選択済みであることを前提に、以後の企画関連画面をここから辿ります。
        </p>
      </div>

      <div class="px-6 py-6">
        <p class="text-sm text-primary">Current circle</p>
        <h3 class="mt-2 text-3xl font-semibold text-body">
          {{ sessionStore.currentCircle?.name ?? "企画未選択" }}
        </h3>
        <p class="mt-2 text-sm text-muted">
          circle id: {{ sessionStore.currentCircle?.id ?? "-" }}
        </p>

        <div class="mt-5 flex flex-wrap gap-3">
          <RouterLink
            class="rounded bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover"
            to="/circles/select"
          >
            企画を切り替える
          </RouterLink>
          <RouterLink
            class="rounded border border-primary px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary-light"
            to="/circles/new"
          >
            新しい企画を作成
          </RouterLink>
        </div>
      </div>
    </section>

    <ListPanel title="利用できる機能" overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink v-for="link in quickLinks" :key="link.to" :to="link.to">
          <template #title>{{ link.label }}</template>
          {{ link.description }}
        </ListItemLink>
      </div>
    </ListPanel>
  </section>
</template>
