<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import {
  extractFirstErrorMessage,
  useCompleteRegistrationMutation,
  useVerifyRegistrationMutation
} from '@/features/auth/api'
import { useFormValidation, userRegistrationFormSchema } from '@/lib/form-validation'
import ErrorState from '@/components/ui/ErrorState.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import FormError from '@/components/ui/FormError.vue'
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
const submitErrorMessage = ref('')
const form = reactive({
  name: '',
  nameYomi: '',
  contactEmail: '',
  phoneNumber: '',
  password: '',
  passwordConfirmation: ''
})

const { fieldErrors, markTouched, validateAll, getFieldError } = useFormValidation({
  schema: userRegistrationFormSchema,
  form: computed(() => form)
})

async function loadVerification() {
  verificationErrorMessage.value = ''
  submitErrorMessage.value = ''

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

async function handleSubmit() {
  submitErrorMessage.value = ''

  // Validate all fields before submitting
  if (!validateAll()) {
    return
  }

  try {
    await completeMutation.mutateAsync({
      pendingRegistrationId: pendingRegistrationId.value,
      token: token.value,
      name: form.name,
      nameYomi: form.nameYomi,
      contactEmail: form.contactEmail,
      phoneNumber: form.phoneNumber,
      password: form.password,
      passwordConfirmation: form.passwordConfirmation
    })
    await router.replace({
      path: '/email/verify',
      query: form.contactEmail ? { sent: 'email' } : {}
    })
  } catch (error) {
    submitErrorMessage.value = extractFirstErrorMessage(error)
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
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p v-if="verifyMutation.isPending.value" class="text-muted">認証URLを確認しています...</p>
        <ErrorState v-if="verificationErrorMessage" :message="verificationErrorMessage" />
        <template v-else-if="verification">
          <p>
            大学メールアドレス <strong>{{ verification.univemail }}</strong> の確認が完了しました。
          </p>
          <ErrorState v-if="submitErrorMessage" :message="submitErrorMessage" />
          <form class="space-y-5" @submit.prevent="handleSubmit">
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
                <FormField label="名前" label-class="font-semibold">
                  <input
                    v-model="form.name"
                    autocomplete="name"
                    name="name"
                    placeholder="姓 名"
                    required
                    type="text"
                    :class="{ 'border-danger': getFieldError('name') }"
                    @blur="markTouched('name')"
                    @input="markTouched('name')"
                  />
                </FormField>
                <FormError v-if="getFieldError('name')" :message="getFieldError('name')" />
              </div>
              <div class="grid gap-2">
                <FormField label="名前(よみ)" label-class="font-semibold">
                  <input
                    v-model="form.nameYomi"
                    name="nameYomi"
                    placeholder="せい めい"
                    required
                    type="text"
                    :class="{ 'border-danger': getFieldError('nameYomi') }"
                    @blur="markTouched('nameYomi')"
                    @input="markTouched('nameYomi')"
                  />
                </FormField>
                <FormError v-if="getFieldError('nameYomi')" :message="getFieldError('nameYomi')" />
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <FormField label="連絡先メールアドレス" label-class="font-semibold">
                  <input
                    v-model="form.contactEmail"
                    autocomplete="email"
                    name="contactEmail"
                    type="email"
                    :class="{ 'border-danger': getFieldError('contactEmail') }"
                    @blur="markTouched('contactEmail')"
                    @input="markTouched('contactEmail')"
                  />
                </FormField>
                <FormError v-if="getFieldError('contactEmail')" :message="getFieldError('contactEmail')" />
              </div>
              <div class="grid gap-2">
                <FormField label="連絡先電話番号" label-class="font-semibold">
                  <input
                    v-model="form.phoneNumber"
                    autocomplete="tel"
                    name="phoneNumber"
                    required
                    type="tel"
                    :class="{ 'border-danger': getFieldError('phoneNumber') }"
                    @blur="markTouched('phoneNumber')"
                    @input="markTouched('phoneNumber')"
                  />
                </FormField>
                <FormError v-if="getFieldError('phoneNumber')" :message="getFieldError('phoneNumber')" />
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <FormField label="パスワード" label-class="font-semibold">
                  <input
                    v-model="form.password"
                    autocomplete="new-password"
                    name="password"
                    placeholder="8文字以上（英字・数字を含む）"
                    required
                    type="password"
                    :class="{ 'border-danger': getFieldError('password') }"
                    @blur="markTouched('password')"
                    @input="markTouched('password')"
                  />
                </FormField>
                <FormError v-if="getFieldError('password')" :message="getFieldError('password')" />
              </div>
              <div class="grid gap-2">
                <FormField label="パスワード(確認)" label-class="font-semibold">
                  <input
                    v-model="form.passwordConfirmation"
                    autocomplete="new-password"
                    name="passwordConfirmation"
                    required
                    type="password"
                    :class="{ 'border-danger': getFieldError('passwordConfirmation') }"
                    @blur="markTouched('passwordConfirmation')"
                    @input="markTouched('passwordConfirmation')"
                  />
                </FormField>
                <FormError
                  v-if="getFieldError('passwordConfirmation')"
                  :message="getFieldError('passwordConfirmation')"
                />
              </div>
            </div>

            <ActionsFooter align="end">
              <button
                class="rounded border border-primary bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
                :disabled="completeMutation.isPending.value"
                type="submit"
              >
                {{ completeMutation.isPending.value ? '登録中...' : '本登録を完了する' }}
              </button>
            </ActionsFooter>
          </form>
        </template>
      </div>
    </SurfaceCard>
  </NarrowPageLayout>
</template>
