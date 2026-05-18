<script setup lang="ts">
import { toValue, type MaybeRefOrGetter } from 'vue'
import { RouterLink } from 'vue-router'
import ListItemLink from '@/components/ui/ListItemLink.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import FaIcon from '@/components/ui/FaIcon.vue'
import { buildApiUrl } from '@/lib/api/client'
import { formatFileSize } from '@/lib/format/fileSize'
import { formatDateTimeUpdated } from '@/lib/format/datetime'
import { useSuspensePublicPageDetailQuery } from '@/features/public-home/api'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'
import ErrorState from '@/components/ui/ErrorState.vue'

const { pageId } = defineProps<{
  pageId: MaybeRefOrGetter<string>
}>()

const pageQuery = useSuspensePublicPageDetailQuery(() => toValue(pageId))
await pageQuery.suspense()
const page = pageQuery.data
</script>

<template>
  <article v-if="page" class="space-y-6">
    <RouterLink
      class="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      to="/public/pages"
    >
      <span aria-hidden="true">‹</span>
      お知らせ
    </RouterLink>

    <section class="border-b border-border pb-6">
      <h1 class="text-[2rem] font-semibold leading-[1.4] text-body">{{ page.title }}</h1>
      <div class="mt-3 text-base text-muted">{{ formatDateTimeUpdated(page.updatedAt) }}</div>
      <div v-if="page.isLimited" class="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        <StatusBadge tone="primary" appearance="outlined">限定公開</StatusBadge>
        <span>このお知らせは、限られた企画のメンバーのみ閲覧可能です。</span>
      </div>
    </section>

    <div class="py-2">
      <PageMarkdownContent :source="page.body" />
    </div>

    <ListPanel v-if="page.documents && page.documents.length > 0" legacy title="関連する配布資料" overflow-hidden>
      <div class="divide-y divide-border">
        <ListItemLink
          v-for="document in page.documents"
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

  <ErrorState v-else message="お知らせを取得できませんでした。" />
</template>
