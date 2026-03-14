<script setup lang="ts">
import BackLink from "@/components/ui/BackLink.vue";
import ListItemLink from "@/components/ui/ListItemLink.vue";
import ListPanel from "@/components/ui/ListPanel.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
import { useSessionStore } from "@/features/session/store";

const sessionStore = useSessionStore();

const settingLinks = [
  {
    to: "/staff/contact-categories",
    label: "お問い合わせ受付設定",
    description: "問い合わせカテゴリと送信先メールを管理します。",
  },
  {
    to: "/staff/tags",
    label: "企画タグ管理",
    description: "申請条件や企画分類で使うタグを管理します。",
  },
  {
    to: "/staff/places",
    label: "場所情報管理",
    description: "使用場所や会場情報のマスタを管理します。",
  },
  {
    to: "/staff/exports",
    label: "CSV / ZIP 出力",
    description: "PortalDots 全体の確認や移行用の出力を扱います。",
  },
];
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/staff"> Staff top へ戻る </BackLink>

    <SurfaceCard tag="header">
      <p class="text-sm text-primary">Portal Settings</p>
      <h2 class="mt-3 text-3xl font-semibold text-body">PortalDots の設定</h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        旧 Laravel UI
        の設定入口に相当するハブ画面です。ポータル全体で共有する設定群へここから移動できます。
      </p>
    </SurfaceCard>

    <ListPanel
      title="設定ハブ"
      :description="sessionStore.currentCircle?.name ?? '企画未選択'"
      overflow-hidden
    >
      <div class="divide-y divide-border">
        <ListItemLink v-for="link in settingLinks" :key="link.to" :to="link.to">
          <template #title>{{ link.label }}</template>
          {{ link.description }}
        </ListItemLink>
      </div>
    </ListPanel>
  </section>
</template>
