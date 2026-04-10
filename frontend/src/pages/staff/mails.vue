<script setup lang="ts">
definePage({
  path: '/staff/mails',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'mailQueue.use'
  }
})

import { computed, ref } from 'vue'
import { formatDateTime } from '@/lib/format/datetime'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useDeleteStaffMailsMutation, useStaffMailsQuery } from '@/features/staff/admin/mails'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const mailsQuery = useStaffMailsQuery(enabled)
const deleteMailsMutation = useDeleteStaffMailsMutation()
const errorMessage = ref('')

async function handleDeleteAll() {
  if (typeof window !== 'undefined' && !window.confirm('メールキューを全件キャンセルしますか？')) {
    return
  }

  errorMessage.value = ''
  try {
    await deleteMailsMutation.mutateAsync()
  } catch {
    errorMessage.value = 'メールキューの全件キャンセルに失敗しました。'
  }
}
</script>

<template>
  <PageLayout>
    <div class="space-y-6">
      <SurfaceCard>
        <SurfaceHeader>
          <template #title>メール配信設定</template>
        </SurfaceHeader>
        <div class="grid gap-3 px-6 py-5 text-sm leading-7 text-body">
          <p>メールの一斉送信機能を利用するには、サーバー側で定期実行の設定が必要です。</p>
          <p>サーバーの CRON 設定で <code>php artisan schedule:run</code> が定期的に実行されるよう設定してください。</p>
          <p class="text-muted">すでに設定が完了している場合でも、この案内は表示されます。</p>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>メールの配信をすべてキャンセル</template>
        </SurfaceHeader>
        <div class="grid gap-3 px-6 py-5 text-sm leading-7 text-body">
          <p>間違えて配信予約したメールは、ここからすべてキャンセルできます。</p>
          <p>配信処理の途中だった場合、一部にはすでに送信されていることがあります。</p>
          <div>
            <button
              class="rounded border border-danger bg-danger-light px-5 py-3 font-bold text-danger transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="deleteMailsMutation.isPending.value"
              type="button"
              @click="handleDeleteAll"
            >
              {{ deleteMailsMutation.isPending.value ? 'キャンセル中...' : 'キューを全件キャンセル' }}
            </button>
          </div>
          <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>現在のメールキュー</template>
        </SurfaceHeader>

        <div v-if="mailsQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>

        <div v-else-if="(mailsQuery.data.value?.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
          メールキューはありません。
        </div>

        <div v-else class="divide-y divide-border">
          <article v-for="mail in mailsQuery.data.value" :key="mail.id" class="px-6 py-5">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-lg font-medium text-body">{{ mail.subject }}</h3>
              <StatusBadge :tone="mail.status === 'sent' ? 'success' : 'primary'">
                {{ mail.status === 'sent' ? '送信済み' : '待機中' }}
              </StatusBadge>
            </div>
            <p class="mt-2 text-sm text-muted-2">recipients: {{ mail.recipients.join(', ') || 'なし' }}</p>
            <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-body">{{ mail.body }}</p>
            <p class="mt-2 text-xs text-muted-2">
              created: {{ formatDateTime(mail.createdAt) }}
              <template v-if="mail.deliveredAt"> / delivered: {{ formatDateTime(mail.deliveredAt) }}</template>
            </p>
          </article>
        </div>
      </SurfaceCard>
    </div>
  </PageLayout>
</template>
