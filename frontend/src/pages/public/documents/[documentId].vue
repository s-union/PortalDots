<script setup lang="ts">
definePage({
  path: '/public/documents/:documentId',
  meta: {
    requiresAuth: false
  }
})

import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import { buildApiUrl } from '@/lib/api/client'

const route = useRoute('/public/documents/[documentId]')

onMounted(() => {
  const documentId = String(route.params.documentId ?? '').trim()
  if (documentId === '' || documentId.startsWith(':')) {
    return
  }

  window.location.replace(buildApiUrl(`/public/documents/${encodeURIComponent(documentId)}`))
})
</script>

<template>
  <NarrowPageLayout class="py-8">
    <section class="rounded border border-border bg-surface px-6 py-6 text-sm text-muted shadow-lv1">
      <p>配布資料を開いています...</p>
      <p class="mt-2">自動的に開かない場合は、ブラウザーのポップアップ設定やダウンロード設定をご確認ください。</p>
    </section>
  </NarrowPageLayout>
</template>
