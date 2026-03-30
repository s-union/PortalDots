<script setup lang="ts">
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
</script>

<template>
  <PageLayout>
    <SurfaceCard>
      <div class="px-6 py-8">
        <p class="text-sm text-primary">404</p>
        <h2 class="mt-2 text-2xl font-semibold text-body">ページが見つかりません</h2>
        <p class="mt-3 text-sm leading-7 text-muted">
          この URL は Vue + Go 側では提供していません。旧 Laravel URL は移植対象外です。
        </p>
        <p class="mt-2 text-sm leading-7 text-muted">
          必要な操作はホーム、ワークスペース、またはスタッフ画面の最新導線から開いてください。
        </p>
      </div>
    </SurfaceCard>
  </PageLayout>
</template>
