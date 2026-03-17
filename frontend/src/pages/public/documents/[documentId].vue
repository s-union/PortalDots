<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
  },
});

import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { buildApiUrl } from "@/lib/api/client";

const route = useRoute("/public/documents/[documentId]");

onMounted(() => {
  const documentId = String(route.params.documentId ?? "").trim();
  if (documentId === "") {
    return;
  }

  window.location.replace(buildApiUrl(`/public/documents/${encodeURIComponent(documentId)}`));
});
</script>

<template>
  <section class="space-y-4 px-6 py-8 text-sm text-muted">
    <p>配布資料を開いています...</p>
    <p>自動的に開かない場合は、ブラウザーのポップアップ設定やダウンロード設定をご確認ください。</p>
  </section>
</template>
