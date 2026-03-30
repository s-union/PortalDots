<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed } from 'vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'
import { useCurrentCircleDetailQuery } from '@/features/circles/api'

const detailQuery = useCurrentCircleDetailQuery()
const confirmationMessage = computed(() => detailQuery.data.value?.confirmationMessage.trim() ?? '')
</script>

<template>
  <PageLayout>
    <SurfaceCard>
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">参加登録を提出しました</h1>
      </div>
      <div class="space-y-5 px-6 py-6 text-sm leading-7 text-body">
        <p class="text-success">
          <strong>企画参加登録の提出が完了しました。</strong>
        </p>
        <p v-if="detailQuery.isPending.value" class="text-muted">読み込み中...</p>
        <div
          v-else-if="confirmationMessage"
          class="rounded border border-success/20 bg-success-light px-4 py-3 text-sm leading-7"
        >
          <PageMarkdownContent :source="confirmationMessage" />
        </div>
        <p v-else>
          内容を再確認したい場合は企画情報ページから閲覧できます。追加の申請や連絡事項はホームから確認してください。
        </p>
        <div class="flex flex-wrap gap-3">
          <RouterLink
            class="inline-flex rounded border border-primary bg-primary px-6 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
            to="/"
          >
            ホームへ戻る
          </RouterLink>
          <RouterLink
            class="inline-flex rounded border border-border bg-surface px-6 py-3 text-sm text-body transition hover:bg-surface-light hover:no-underline"
            to="/workspace/circles/detail"
          >
            企画情報を見る
          </RouterLink>
        </div>
      </div>
    </SurfaceCard>
  </PageLayout>
</template>
