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
      <h2 class="text-2xl font-semibold leading-[1.4] text-muted">お探しのページは見つかりませんでした</h2>
      <p class="mt-4 text-base text-muted">URLをご確認ください</p>
      <div class="mt-6">
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
