<script setup lang="ts">
import PageLayout from '@/components/layouts/PageLayout.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PanelBody from '@/components/ui/PanelBody.vue'
import { computed } from 'vue'
import { usePublicConfigQuery } from '@/features/public-home/api'

const supportBrowsers = ['Microsoft Edge 最新版', 'Mozilla Firefox 最新版', 'Google Chrome 最新版', 'Safari 最新版']
const publicConfigQuery = usePublicConfigQuery()
const appName = computed(() => publicConfigQuery.data.value?.appName ?? 'PortalDots')
</script>

<template>
  <PageLayout spacious>
    <ListPanel legacy title="ブラウザ環境について">
      <PanelBody class="text-base leading-[1.7] text-body">
        <p>{{ appName }}は以下の環境でご覧いただくことを推奨いたします。</p>
        <ul class="mt-2 list-disc space-y-1 pl-6">
          <li v-for="browser in supportBrowsers" :key="browser">{{ browser }}</li>
        </ul>
        <p class="mt-4">
          推奨環境以外で利用された場合や、推奨環境下でもご利用のブラウザの設定等によっては、正しく表示されない場合がありますのでご了承ください。
        </p>
      </PanelBody>
    </ListPanel>
  </PageLayout>
</template>
