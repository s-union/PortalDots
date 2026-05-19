<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import { buildApiUrl } from '@/lib/api/client'
import { formatFileSize } from '@/lib/format/fileSize'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { usePageDetailQuery } from '@/features/pages/api'
import PageLayout from '@/components/layouts/PageLayout.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'
import LoadingState from '@/components/ui/LoadingState.vue'

const route = useRoute('/workspace/pages/[pageId]')
const pageId = computed(() => String(route.params.pageId ?? ''))
const pageQuery = usePageDetailQuery(pageId)
</script>

<template>
  <PageLayout>
    <LoadingState v-if="pageQuery.isPending.value" />

    <article v-else-if="pageQuery.data.value" class="space-y-6">
      <RouterLink
        to="/workspace/pages"
        class="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <span aria-hidden="true">‹</span>
        お知らせ
      </RouterLink>

      <section class="border-b border-border pb-6">
        <h1 class="text-[2rem] font-semibold leading-[1.4] text-body">{{ pageQuery.data.value.title }}</h1>
        <div class="mt-3 text-base text-muted">{{ formatDateTimeUpdated(pageQuery.data.value.updatedAt) }}</div>
        <div v-if="pageQuery.data.value.isLimited" class="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <StatusBadge tone="primary" appearance="outlined">限定公開</StatusBadge>
        </div>
      </section>

      <div class="rounded bg-surface px-6 py-8 shadow-lv1">
        <PageMarkdownContent :source="pageQuery.data.value.body" />
      </div>

      <ListPanel v-if="pageQuery.data.value.documents.length > 0" legacy title="関連する配布資料" overflow-hidden>
        <div class="divide-y divide-border">
          <ListItemLink
            v-for="document in pageQuery.data.value.documents"
            :key="document.id"
            legacy
            :href="buildApiUrl(document.downloadUrl)"
            new-tab
          >
            <template #title>
              <FaIcon v-if="document.isImportant" name="exclamation-circle" fixed-width class-name="text-danger" />
              <FaIcon v-else name="file-alt" prefix="far" fixed-width class-name="text-muted" />
              {{ document.name }}
            </template>
            <template #meta>
              {{ formatDateTimeUpdated(document.updatedAt) }}
              <br />
              {{ document.extension || 'FILE' }}ファイル • {{ formatFileSize(document.sizeBytes) }}
            </template>
            {{ document.description }}
          </ListItemLink>
        </div>
      </ListPanel>
    </article>

    <AlertMessage v-else tone="danger"> お知らせを取得できませんでした。 </AlertMessage>
  </PageLayout>
</template>
