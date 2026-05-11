<script setup lang="ts">
definePage({
  path: '/workspace/circles/done',
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
import LoadingMessage from '@/components/ui/LoadingMessage.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'

const detailQuery = useCurrentCircleDetailQuery()
const confirmationMessage = computed(() => detailQuery.data.value?.confirmationMessage.trim() ?? '')
</script>

<template>
  <PageLayout spacious>
    <SurfaceCard>
      <SurfaceCardBand>
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">参加登録を提出しました！</h1>
      </SurfaceCardBand>
      <div class="space-y-5 px-6 py-6 text-sm leading-7 text-body">
        <div class="text-center text-success">
          <FaIcon name="check-circle" class-name="text-3xl" />
        </div>
        <LoadingMessage v-if="detailQuery.isPending.value" />
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
        </div>
      </div>
    </SurfaceCard>
  </PageLayout>
</template>
