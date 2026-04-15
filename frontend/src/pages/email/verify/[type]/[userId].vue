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

const router = useRouter()
const route = useRoute()
const routeParams = computed(() => route.params as Record<string, string | string[] | undefined>)
const verifyType = computed(() => {
  const value = routeParams.value.type
  return typeof value === 'string' ? value : 'unknown'
})
const pendingRegistrationId = computed(() => {
  const value = routeParams.value.userId
  return typeof value === 'string' ? value : 'unknown'
})
const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value : ''
})
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
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">ユーザー登録を続ける</h1>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p v-if="verifyMutation.isPending.value" class="text-muted">認証URLを確認しています...</p>
        <p
          v-else-if="verificationErrorMessage"
          class="rounded border border-danger bg-danger-light px-4 py-3 text-danger"
        >
          {{ verificationErrorMessage }}
        </p>
        <template v-else-if="verification">
          <p>
            大学メールアドレス <strong>{{ verification.univemail }}</strong> の確認が完了しました。
          </p>
          <p v-if="submitErrorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-danger">
            {{ submitErrorMessage }}
          </p>
          <form class="space-y-5" @submit.prevent="handleSubmit">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2">
                <span class="font-semibold">学籍番号</span>
                <input :value="verification.studentId" disabled name="studentId" type="text" />
              </label>
              <label class="grid gap-2">
                <span class="font-semibold">大学メールアドレス</span>
                <input :value="verification.univemail" disabled name="univemail" type="email" />
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <label class="grid gap-2">
                  <span class="font-semibold">名前</span>
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
                </label>
                <p v-if="getFieldError('name')" class="text-xs text-danger">
                  {{ getFieldError('name') }}
                </p>
              </div>
              <div class="grid gap-2">
                <label class="grid gap-2">
                  <span class="font-semibold">名前(よみ)</span>
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
                </label>
                <p v-if="getFieldError('nameYomi')" class="text-xs text-danger">
                  {{ getFieldError('nameYomi') }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <label class="grid gap-2">
                  <span class="font-semibold">連絡先メールアドレス</span>
                  <input
                    v-model="form.contactEmail"
                    autocomplete="email"
                    name="contactEmail"
                    type="email"
                    :class="{ 'border-danger': getFieldError('contactEmail') }"
                    @blur="markTouched('contactEmail')"
                    @input="markTouched('contactEmail')"
                  />
                </label>
                <p v-if="getFieldError('contactEmail')" class="text-xs text-danger">
                  {{ getFieldError('contactEmail') }}
                </p>
              </div>
              <div class="grid gap-2">
                <label class="grid gap-2">
                  <span class="font-semibold">連絡先電話番号</span>
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
                </label>
                <p v-if="getFieldError('phoneNumber')" class="text-xs text-danger">
                  {{ getFieldError('phoneNumber') }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <label class="grid gap-2">
                  <span class="font-semibold">パスワード</span>
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
                </label>
                <p v-if="getFieldError('password')" class="text-xs text-danger">
                  {{ getFieldError('password') }}
                </p>
              </div>
              <div class="grid gap-2">
                <label class="grid gap-2">
                  <span class="font-semibold">パスワード(確認)</span>
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
                </label>
                <p v-if="getFieldError('passwordConfirmation')" class="text-xs text-danger">
                  {{ getFieldError('passwordConfirmation') }}
                </p>
              </div>
            </div>

            <div class="flex justify-end">
              <button
                class="rounded border border-primary bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
                :disabled="completeMutation.isPending.value"
                type="submit"
              >
                {{ completeMutation.isPending.value ? '登録中...' : '本登録を完了する' }}
              </button>
            </div>
          </form>
        </template>
      </div>
    </section>
  </NarrowPageLayout>
</template>
