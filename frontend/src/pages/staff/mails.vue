<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'mailQueue.use'
  }
})

import { computed, ref } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import PageHeader from '@/components/layouts/PageHeader.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants, formControlVariants } from '@/lib/ui/variants'
import { useAllStaffCirclesQuery } from '@/features/staff/circles/api'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import {
  extractStaffMailValidationMessage,
  normalizeRecipientList,
  useCreateStaffMailMutation,
  useStaffMailForm,
  useStaffMailsQuery
} from '@/features/staff/admin/mails'
import { useSessionStore } from '@/features/session/store'

const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const enabled = computed(() => staffStatusQuery.data.value?.authorized === true)
const circlesQuery = useAllStaffCirclesQuery(enabled)
const mailsQuery = useStaffMailsQuery(enabled)
const createMailMutation = useCreateStaffMailMutation()
const form = useStaffMailForm()
const errorMessage = ref('')

async function handleCreateMail() {
  errorMessage.value = ''

  try {
    await createMailMutation.mutateAsync({
      circleId: form.value.circleId,
      subject: form.value.subject,
      body: form.value.body,
      recipients: normalizeRecipientList(form.value.recipientsText)
    })
    form.value = {
      circleId: '',
      subject: '',
      body: '',
      recipientsText: ''
    }
  } catch (error) {
    errorMessage.value = extractStaffMailValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <PageHeader
      eyebrow="Staff Mail Queue"
      title="メールキュー"
      description="対象企画を選んでモックメールをキューに積みます。実メールは送信しません。"
    >
      <template #actions>
        <BackLink to="/staff">Staff top へ戻る</BackLink>
      </template>
    </PageHeader>

    <div class="space-y-6">
      <SurfaceCard tag="form" @submit.prevent="handleCreateMail">
        <SurfaceHeader>
          <template #title>メール配信設定</template>
        </SurfaceHeader>
        <div class="grid gap-4 px-6 py-5">
          <p class="rounded border border-border bg-surface-light px-4 py-3 text-sm text-muted">
            この画面で登録したメールはすべてモック扱いです。宛先や本文は確認できますが、外部送信は行いません。
          </p>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">対象企画</span>
            <select v-model="form.circleId" :class="formControlVariants()" name="circleId">
              <option value="">企画を選択してください</option>
              <option v-for="circle in circlesQuery.data.value ?? []" :key="circle.id" :value="circle.id">
                {{ circle.name }}
              </option>
            </select>
          </label>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">件名</span>
            <input v-model="form.subject" :class="formControlVariants()" name="subject" type="text" />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">本文</span>
            <textarea v-model="form.body" :class="cn(formControlVariants(), 'min-h-40')" name="body" />
          </label>

          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">宛先</span>
            <textarea
              v-model="form.recipientsText"
              :class="cn(formControlVariants(), 'min-h-28')"
              name="recipients"
              placeholder="demo@example.com, sub@example.com"
            />
          </label>

          <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
        </div>
        <div class="border-t border-border px-6 py-5">
          <button
            :class="buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' })"
            :disabled="createMailMutation.isPending.value"
            type="submit"
          >
            {{ createMailMutation.isPending.value ? '登録中...' : 'モックメールをキューに追加' }}
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SurfaceHeader>
          <template #title>メールキュー</template>
        </SurfaceHeader>

        <div v-if="mailsQuery.isPending.value" class="px-6 py-5 text-sm text-muted">読み込み中...</div>

        <div v-else-if="(mailsQuery.data.value?.length ?? 0) === 0" class="px-6 py-5 text-sm text-muted">
          モックメールキューはまだありません。
        </div>

        <div v-else class="divide-y divide-border">
          <article v-for="mail in mailsQuery.data.value" :key="mail.id" class="px-6 py-5">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-lg font-medium text-body">{{ mail.subject }}</h3>
              <StatusBadge :tone="mail.status === 'sent' ? 'success' : 'primary'">
                {{ mail.status === 'sent' ? 'モック送信済み' : 'モック待機中' }}
              </StatusBadge>
            </div>
            <p class="mt-2 text-sm text-muted-2">circle: {{ mail.circle.name }} ({{ mail.circle.id }})</p>
            <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-body">{{ mail.body }}</p>
            <p class="mt-4 text-sm text-muted-2">recipients: {{ mail.recipients.join(', ') }}</p>
            <p class="mt-2 text-xs text-muted-2">
              created: {{ mail.createdAt }}
              <template v-if="mail.deliveredAt"> / delivered: {{ mail.deliveredAt }}</template>
            </p>
          </article>
        </div>
      </SurfaceCard>
    </div>
  </PageLayout>
</template>
