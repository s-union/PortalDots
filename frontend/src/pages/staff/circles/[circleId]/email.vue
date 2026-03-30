<script setup lang="ts">
definePage({
  path: '/staff/circles/:circleId/email',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true,
    requiresStaffAuthorized: true,
    staffCapability: 'circles.mail'
  }
})

import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceHeader from '@/components/ui/SurfaceHeader.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { canAccessCircleMail, canEditCircles } from '@/features/staff/access/capabilities'
import { useAuthorizedStaffContext } from '@/features/staff/hooks/useAuthorizedStaffContext'
import {
  extractStaffCircleMailValidationMessage,
  useSendStaffCircleMailMutation,
  useStaffCircleMailForm,
  useStaffCircleMailFormQuery
} from '@/features/staff/circles/api'
import { buildStaffCircleTabs } from '@/features/ui/tabStrip'

const route = useRoute('/staff/circles/[circleId]/email')
const circleId = computed(() => String(route.params.circleId ?? ''))
const { enabled, sessionStore } = useAuthorizedStaffContext({ capability: 'circles.mail' })
const mailFormQuery = useStaffCircleMailFormQuery(circleId, enabled)
const sendCircleMailMutation = useSendStaffCircleMailMutation(circleId)
const mailForm = useStaffCircleMailForm()
const errorMessage = ref('')
const successMessage = ref('')

const canEdit = computed(() => canEditCircles(sessionStore.roles, sessionStore.permissions))
const circleTabs = computed(() =>
  buildStaffCircleTabs(circleId.value, 'mail', {
    canEdit: canEdit.value,
    canSendEmails: canAccessCircleMail(sessionStore.roles, sessionStore.permissions)
  })
)
const mailRecipientCount = computed(() => mailFormQuery.data.value?.recipients.length ?? 0)
const canSendMail = computed(() => mailRecipientCount.value > 0 && !sendCircleMailMutation.isPending.value)

async function handleSendMail() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await sendCircleMailMutation.mutateAsync({
      recipient: mailForm.value.recipient,
      subject: mailForm.value.subject,
      body: mailForm.value.body
    })
    mailForm.value = {
      recipient: mailForm.value.recipient,
      subject: '',
      body: ''
    }
    successMessage.value = '企画所属者向けメールをキューに追加しました。'
  } catch (error) {
    errorMessage.value = extractStaffCircleMailValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <TabStrip :tabs="circleTabs" />

    <div v-if="mailFormQuery.isPending.value" class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">
      読み込み中...
    </div>

    <div v-else-if="mailFormQuery.data.value" class="space-y-6">
      <SurfaceCard tag="header">
        <SurfaceHeader>
          <template #title>{{ mailFormQuery.data.value.circle.name }}</template>
          <template #description>企画所属者向けのメール送信内容を登録します。</template>
        </SurfaceHeader>
        <p class="mt-4 text-sm text-muted">{{ mailFormQuery.data.value.circle.groupName }}</p>
      </SurfaceCard>

      <SettingsSection title="企画所属者向けメール送信">
        <SettingsRow>
          <div class="grid gap-4">
            <p class="text-sm text-muted">送信対象: {{ mailRecipientCount }} 名</p>

            <p
              v-if="mailRecipientCount === 0"
              class="rounded border border-border bg-surface-light px-4 py-3 text-sm text-muted"
            >
              宛先となる企画所属者がいないため、メールは送信できません。
            </p>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">宛先</span>
              <select v-model="mailForm.recipient" name="recipient">
                <option value="all">所属者全員</option>
                <option value="leader">責任者のみ</option>
              </select>
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">件名</span>
              <input v-model="mailForm.subject" name="subject" type="text" />
            </label>

            <label class="grid gap-2 text-sm text-body">
              <span class="font-medium">本文</span>
              <textarea v-model="mailForm.body" class="min-h-40" name="body" />
            </label>

            <div class="rounded border border-border bg-surface-light px-4 py-4 text-sm leading-7 text-muted">
              <p>登録内容はキューに保存され、配信処理の対象になります。</p>
              <p>本文は Markdown 記法をそのまま記入できます。</p>
              <p class="mt-2">現在はスタッフ用控えを送らず、本体送信のみを先行実装しています。</p>
              <p class="mt-2">
                宛先候補:
                {{
                  mailFormQuery.data.value.recipients.map((recipient) => recipient.displayName).join(' / ') || 'なし'
                }}
              </p>
            </div>
          </div>
        </SettingsRow>
        <template #footer>
          <button
            class="rounded bg-primary px-8 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canSendMail"
            type="button"
            @click="handleSendMail"
          >
            {{ sendCircleMailMutation.isPending.value ? '登録中...' : 'メールをキューに追加' }}
          </button>
        </template>
      </SettingsSection>

      <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
      <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
    </div>

    <div v-else class="rounded border border-danger bg-danger-light p-6 text-danger">
      企画向けメール送信情報を取得できませんでした。
    </div>
  </PageLayout>
</template>
