<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/mails',
  meta: staffPageMeta('mailQueue.use')
})

import { computed } from 'vue'
import { formatDateTime } from '@/lib/format/datetime'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffMailsQuery } from '@/features/staff/admin/mails'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const mailsQuery = useStaffMailsQuery(enabled)
</script>

<template>
  <PageLayout>
    <div class="space-y-6">
      <SurfaceCard>
        <SurfaceHeader>
          <template #title>メール配信設定</template>
        </SurfaceHeader>
        <div class="grid gap-3 px-6 py-5 text-sm leading-7 text-body">
          <p>メールの一斉送信機能は Cloudflare Workers で実行されています。</p>
          <p class="text-muted">送信依頼されたメールの履歴は以下に表示されます。</p>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>配信履歴</template>
        </SurfaceHeader>

        <div v-if="mailsQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>

        <div v-else-if="(mailsQuery.data.value?.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
          配信履歴はありません。
        </div>

        <div v-else class="divide-y divide-border">
          <article v-for="mail in mailsQuery.data.value" :key="mail.jobId" class="px-6 py-5">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-lg font-medium text-body">{{ mail.subject }}</h3>
            </div>
            <p class="mt-2 text-sm text-muted-2">送信先: {{ mail.recipients.join(', ') || 'なし' }}</p>
            <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-body">{{ mail.body }}</p>
            <p class="mt-2 text-xs text-muted-2">優先度: {{ mail.priority }}</p>
            <p class="mt-2 text-xs text-muted-2">作成日時: {{ formatDateTime(mail.createdAt) }}</p>
          </article>
        </div>
      </SurfaceCard>
    </div>
  </PageLayout>
</template>
