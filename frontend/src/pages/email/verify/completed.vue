<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
</script>

<template>
  <NarrowPageLayout class="py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">メール認証完了</h1>
      </div>
      <div class="space-y-5 px-6 py-6 text-center text-sm leading-7 text-body">
        <p class="text-success">
          <i class="fas fa-check-circle" aria-hidden="true" />
          <strong>必須のメール認証が完了しました。企画参加登録を進められます。</strong>
        </p>
        <p>
          <RouterLink
            class="inline-flex rounded border border-primary bg-primary px-6 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
            to="/"
          >
            ホームにアクセス
          </RouterLink>
        </p>
      </div>
    </section>
  </NarrowPageLayout>
</template>
