<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import privacyPolicyMarkdown from './privacy_policy.md?raw'
import PageLayout from '@/components/layouts/PageLayout.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
const PageMarkdownContent = defineAsyncComponent(() => import('@/features/pages/components/PageMarkdownContent.vue'))
import { usePublicConfigQuery } from '@/features/public-home/api'

const publicConfigQuery = usePublicConfigQuery()
const isDemoMode = computed(() => publicConfigQuery.data.value?.isDemo ?? false)

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
    <section v-if="isDemoMode" class="flex min-h-[calc(100dvh-15rem)] flex-col items-center px-4 pt-4 text-center">
      <h2 class="text-[1.333rem] font-semibold leading-[1.4] text-body">お探しのページは見つかりませんでした</h2>
      <p class="mt-1 text-sm text-muted">URLをご確認ください</p>
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

    <ListPanel v-if="!isDemoMode" legacy>
      <div class="px-6 py-[1.2rem] text-base leading-[1.7] text-body max-[1000px]:px-4">
        <PageMarkdownContent
          :source="privacyPolicyMarkdown"
          class="[&_h1]:mb-4 [&_h1]:text-[1.333rem] [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:mb-1 [&_p]:mb-3"
        />
      </div>
    </ListPanel>
  </PageLayout>
</template>
