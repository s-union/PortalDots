<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true
  }
})
</script>

<template>
  <section class="mx-auto w-full max-w-[880px] space-y-6 px-6 py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">ユーザー登録</h1>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p>現在のVue版では旧Laravelの登録フォームは未移植です。</p>
        <p>運営から案内された手順でアカウント作成または招待受け入れを進めてください。</p>
      </div>
    </section>

    <div class="pt-2 text-center">
      <RouterLink
        class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
        to="/login"
      >
        ログイン画面へ
      </RouterLink>
    </div>
  </section>
</template>
