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
import ErrorState from '@/components/ui/ErrorState.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import FormischField from '@/components/forms/FormischField.vue'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormField from '@/components/ui/FormField.vue'
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
            <div class="grid gap-4 md:grid-cols-2">
              <FormField label="学籍番号" label-class="font-semibold">
                <input :value="verification.studentId" disabled name="studentId" type="text" />
              </FormField>
              <FormField label="大学メールアドレス" label-class="font-semibold">
                <input :value="verification.univemail" disabled name="univemail" type="email" />
              </FormField>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <FormischField
                  v-slot="{ field, control }"
                  :of="form"
                  :path="['name']"
                  label="名前"
                  label-class="font-semibold"
                >
                  <input
                    v-bind="control"
                    v-model="field.input"
                    autocomplete="name"
                    name="name"
                    placeholder="姓 名"
                    required
                    type="text"
                  />
                </FormischField>
              </div>
              <div class="grid gap-2">
                <FormischField
                  v-slot="{ field, control }"
                  :of="form"
                  :path="['nameYomi']"
                  label="名前(よみ)"
                  label-class="font-semibold"
                >
                  <input
                    v-bind="control"
                    v-model="field.input"
                    name="nameYomi"
                    placeholder="せい めい"
                    required
                    type="text"
                  />
                </FormischField>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <FormischField
                  v-slot="{ field, control }"
                  :of="form"
                  :path="['contactEmail']"
                  label="連絡先メールアドレス"
                  label-class="font-semibold"
                >
                  <input v-bind="control" v-model="field.input" autocomplete="email" name="contactEmail" type="email" />
                </FormischField>
              </div>
              <div class="grid gap-2">
                <FormischField
                  v-slot="{ field, control }"
                  :of="form"
                  :path="['phoneNumber']"
                  label="連絡先電話番号"
                  label-class="font-semibold"
                >
                  <input
                    v-bind="control"
                    v-model="field.input"
                    autocomplete="tel"
                    name="phoneNumber"
                    required
                    type="tel"
                  />
                </FormischField>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <FormischField
                  v-slot="{ field, control }"
                  :of="form"
                  :path="['password']"
                  label="パスワード"
                  label-class="font-semibold"
                >
                  <input
                    v-bind="control"
                    v-model="field.input"
                    autocomplete="new-password"
                    name="password"
                    placeholder="8文字以上（英字・数字を含む）"
                    required
                    type="password"
                  />
                </FormischField>
              </div>
              <div class="grid gap-2">
                <FormischField
                  v-slot="{ field, control }"
                  :of="form"
                  :path="['passwordConfirmation']"
                  label="パスワード(確認)"
                  label-class="font-semibold"
                >
                  <input
                    v-bind="control"
                    v-model="field.input"
                    autocomplete="new-password"
                    name="passwordConfirmation"
                    required
                    type="password"
                  />
                </FormischField>
              </div>
            </div>

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
