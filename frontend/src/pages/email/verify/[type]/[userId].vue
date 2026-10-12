<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import {
  extractFirstErrorMessage,
  useCompleteRegistrationMutation,
  useVerifyRegistrationMutation
} from '@/features/auth/api'
import { userRegistrationFormSchema } from '@/lib/form-validation'
import { SchemaFormFields } from '@/features/forms/schema-form'
import ErrorState from '@/components/ui/ErrorState.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import { routeParamString, routeString } from '@/lib/routeQuery'

const router = useRouter()
const route = useRoute()
const verifyType = computed(() => {
  const fromParams = routeParamString(route.params, 'type', '')
  if (fromParams) {
    return fromParams
  }
  const segments = route.path.split('/')
  return segments[3] || 'unknown'
})
const pendingRegistrationId = computed(() => {
  const fromParams = routeParamString(route.params, 'userId', '')
  if (fromParams) {
    return fromParams
  }
  const segments = route.path.split('/')
  return segments[4] || 'unknown'
})
const token = computed(() => routeString(route.query.token))
const verifyMutation = useVerifyRegistrationMutation()
const completeMutation = useCompleteRegistrationMutation()
const verification = ref<{ univemail: string; studentId: string } | null>(null)
const verificationErrorMessage = ref('')
const {
  form,
  errorMessage: submitErrorMessage,
  submitEvent: handleSubmit
} = useSubmitForm({
  schema: userRegistrationFormSchema,
  initialInput: { name: '', nameYomi: '', contactEmail: '', phoneNumber: '', password: '', passwordConfirmation: '' },
  disabled: () => !verification.value,
  errorMessage: extractFirstErrorMessage,
  submit: async (input) => {
    await completeMutation.mutateAsync({
      ...input,
      pendingRegistrationId: pendingRegistrationId.value,
      token: token.value
    })
    await router.replace({ path: '/email/verify', query: input.contactEmail ? { sent: 'email' } : {} })
  }
})

async function loadVerification() {
  verificationErrorMessage.value = ''

  if (verifyType.value !== 'univemail' || pendingRegistrationId.value === 'unknown' || token.value.trim() === '') {
    verificationErrorMessage.value = '認証URLが無効か期限切れです。もう一度お試しください。'
    return
  }

  try {
    const result = await verifyMutation.mutateAsync({
      pendingRegistrationId: pendingRegistrationId.value,
      token: token.value
    })
    verification.value = {
      univemail: result.univemail,
      studentId: result.studentId
    }
  } catch (error) {
    verificationErrorMessage.value = extractFirstErrorMessage(error)
  }
}

onMounted(() => {
  void loadVerification()
})
</script>

<template>
  <NarrowPageLayout class="space-y-6 py-8">
    <SurfaceCard tag="section">
      <SurfaceCardBand>
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">ユーザー登録を続ける</h1>
      </SurfaceCardBand>
      <div class="space-y-4 px-6 py-6 text-base leading-7 text-body">
        <p v-if="verifyMutation.isPending.value" class="text-muted">認証URLを確認しています...</p>
        <ErrorState v-if="verificationErrorMessage" :message="verificationErrorMessage" />
        <template v-else-if="verification">
          <p>
            大学メールアドレス <strong>{{ verification.univemail }}</strong> の確認が完了しました。
          </p>
          <ErrorState v-if="submitErrorMessage" :message="submitErrorMessage" />
          <form class="space-y-5" novalidate :aria-busy="form.isSubmitting" @submit="handleSubmit">
            <SchemaFormFields
              :of="form"
              :schema="userRegistrationFormSchema"
              :display-values="{ studentId: verification.studentId, univemail: verification.univemail }"
            />

            <ActionsFooter align="end">
              <button
                class="rounded border border-primary bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
                :disabled="form.isSubmitting"
                type="submit"
              >
                {{ form.isSubmitting ? '登録中...' : '本登録を完了する' }}
              </button>
            </ActionsFooter>
          </form>
        </template>
      </div>
    </SurfaceCard>
  </NarrowPageLayout>
</template>
