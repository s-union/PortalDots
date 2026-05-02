<script setup lang="ts">
definePage({
  path: '/staff/circles/:circleId/email',
  meta: staffPageMeta('circles.mail')
})

import { staffPageMeta } from '@/lib/pageMeta'

import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import FormField from '@/components/ui/FormField.vue'
import FormInput from '@/components/ui/FormInput.vue'
import InfoBox from '@/components/ui/InfoBox.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
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
import { buildStaffCircleTabs } from '@/lib/ui/tabStrip'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

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

    <LoadingState v-if="mailFormQuery.isPending.value" />

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

            <InfoBox v-if="mailRecipientCount === 0" as="p" class="text-muted">
              宛先となる企画所属者がいないため、メールは送信できません。
            </InfoBox>

            <FormField label="宛先" label-class="font-medium">
              <select v-model="mailForm.recipient" name="recipient">
                <option value="all">所属者全員</option>
                <option value="leader">責任者のみ</option>
              </select>
            </FormField>

            <FormField label="件名" label-class="font-medium">
              <FormInput v-model="mailForm.subject" name="subject" type="text" />
            </FormField>

            <FormField label="本文" label-class="font-medium">
              <MarkdownEditorField
                v-model="mailForm.body"
                min-height-class="min-h-40"
                name="body"
                placeholder="本文を入力"
              />
            </FormField>

            <InfoBox class="text-muted leading-7">
              <p>登録内容はキューに保存され、配信処理の対象になります。</p>
              <p>本文は Markdown 記法をそのまま記入できます。</p>
              <p class="mt-2">現在はスタッフ用控えを送らず、本体送信のみを先行実装しています。</p>
              <p class="mt-2">
                宛先候補:
                {{
                  mailFormQuery.data.value.recipients.map((recipient) => recipient.displayName).join(' / ') || 'なし'
                }}
              </p>
            </InfoBox>
          </div>
        </SettingsRow>
        <template #footer>
          <BaseButton
            variant="primary"
            size="wide"
            weight="bold"
            :disabled="!canSendMail"
            type="button"
            @click="handleSendMail"
          >
            {{ sendCircleMailMutation.isPending.value ? '登録中...' : 'メールをキューに追加' }}
          </BaseButton>
        </template>
      </SettingsSection>

      <AlertMessage v-if="successMessage" tone="success">{{ successMessage }}</AlertMessage>
      <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>
    </div>

    <ErrorState v-else message="企画向けメール送信情報を取得できませんでした。" />
  </PageLayout>
</template>
