<script setup lang="ts">
const supportBrowsers = [
  "Microsoft Edge 最新版",
  "Mozilla Firefox 最新版",
  "Google Chrome 最新版",
  "Safari 最新版",
];
</script>

<template>
  <section class="mx-auto w-full max-w-[1024px] px-6 py-4 max-[1000px]:px-4">
    <section class="pb-2 pt-4">
      <div class="rounded-[0.45rem] bg-surface shadow-lv1">
        <div class="border-b border-border px-6 py-[1.2rem] max-[1000px]:px-4">
          <h2 class="text-[1.333rem] font-semibold leading-[1.4] text-body">
            ブラウザ環境について
          </h2>
        </div>
        <div class="px-6 py-[1.2rem] text-base leading-[1.7] text-body max-[1000px]:px-4">
          <p>PortalDotsは以下の環境でご覧いただくことを推奨いたします。</p>
          <ul class="mt-2 list-disc space-y-1 pl-6">
            <li v-for="browser in supportBrowsers" :key="browser">{{ browser }}</li>
          </ul>
          <p class="mt-4">
            推奨環境以外で利用された場合や、推奨環境下でもご利用のブラウザの設定等によっては、正しく表示されない場合がありますのでご了承ください。
          </p>
        </div>
      </div>
    </section>
  </section>
</template>
