<script setup lang="ts">
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";

const supportBrowsers = [
  "Microsoft Edge 最新版",
  "Mozilla Firefox 最新版",
  "Google Chrome 最新版",
  "Safari 最新版",
];
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/"> ホームへ戻る </BackLink>

    <SurfaceCard>
      <div class="border-b border-border px-6 py-5">
        <p class="text-sm text-primary">Support</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">ブラウザ環境について</h2>
      </div>
      <div class="space-y-5 px-6 py-6 text-sm leading-7 text-body">
        <p>PortalDots は以下の環境での利用を推奨しています。</p>
        <ul class="list-disc space-y-2 pl-6">
          <li v-for="browser in supportBrowsers" :key="browser">{{ browser }}</li>
        </ul>
        <p>
          推奨環境以外で利用された場合や、推奨環境下でもブラウザ設定によっては正しく表示されないことがあります。問題が起きる場合は最新版ブラウザへの更新をお試しください。
        </p>
      </div>
    </SurfaceCard>
  </section>
</template>
