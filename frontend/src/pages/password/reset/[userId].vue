<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
</script>

<template>
  <NarrowPageLayout class="space-y-6 py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">パスワードの再設定</h1>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>このリンクからのパスワード再設定は利用できません。</p>
        <p>再設定が必要な場合は、ログイン画面から運営へお問い合わせください。</p>
      </div>
    </section>
    <div class="pt-2 text-center">
      <RouterLink
        class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
        to="/password/reset"
      >
        再設定方法の案内を見る
      </RouterLink>
    </div>
  </NarrowPageLayout>
</template>
