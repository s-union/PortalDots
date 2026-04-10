<script setup lang="ts">
import PageLayout from '@/components/layouts/PageLayout.vue'

function handleBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back()
    return
  }

  if (typeof window !== 'undefined') {
    window.location.assign('/')
  }
}
</script>

<template>
  <PageLayout>
    <section class="flex min-h-[calc(100dvh-15rem)] flex-col items-center justify-center px-4 pt-4 text-center">
      <p class="text-sm text-primary">404</p>
      <h2 class="mt-3 text-[1.333rem] font-semibold leading-[1.4] text-body">ページが見つかりません</h2>
      <p class="mt-2 text-sm text-muted">この URL は現在のアプリでは提供していません。</p>
      <p class="mt-2 text-sm text-muted">
        必要な操作はホーム、ワークスペース、またはスタッフ画面の最新導線から開いてください。
      </p>
      <div class="mt-4">
        <button
          class="inline-flex rounded border border-primary bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          type="button"
          @click="handleBack"
        >
          前のページに戻る
        </button>
      </div>
    </section>
  </PageLayout>
</template>
