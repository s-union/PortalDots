<script setup lang="ts">
import BackLink from "@/components/ui/BackLink.vue";
import SurfaceCard from "@/components/ui/SurfaceCard.vue";
</script>

<template>
  <section class="space-y-6">
    <BackLink to="/"> ホームへ戻る </BackLink>
    <SurfaceCard>
      <div class="px-6 py-8">
        <p class="text-sm text-primary">404</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">ページが見つかりません</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          指定された URL に対応する画面はまだ移行されていないか、存在しません。
        </p>
      </div>
    </SurfaceCard>
  </section>
</template>
