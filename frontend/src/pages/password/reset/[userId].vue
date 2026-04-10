<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import {
  extractFirstErrorMessage,
  useCompletePasswordResetMutation,
  useVerifyPasswordResetMutation
} from '@/features/auth/api'

const route = useRoute()
const routeParams = computed(() => route.params as Record<string, string | string[] | undefined>)
const userId = computed(() => {
  const value = routeParams.value.userId
  return typeof value === 'string' ? value : ''
})
const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value : ''
})

const verifyMutation = useVerifyPasswordResetMutation()
const completeMutation = useCompletePasswordResetMutation()
const verificationErrorMessage = ref('')
const submitErrorMessage = ref('')
const completed = ref(false)
const form = reactive({
  password: '',
  passwordConfirmation: ''
})

async function verifyResetURL() {
  verificationErrorMessage.value = ''
  submitErrorMessage.value = ''
  completed.value = false

  if (userId.value === '' || token.value.trim() === '') {
    verificationErrorMessage.value = '再設定URLが無効か期限切れです。もう一度お試しください。'
    return
  }

  try {
    await verifyMutation.mutateAsync({
      userId: userId.value,
      token: token.value
    })
  } catch (error) {
    verificationErrorMessage.value = extractFirstErrorMessage(error)
  }
}

function validatePassword() {
  const password = form.password.trim()
  const passwordConfirmation = form.passwordConfirmation.trim()
  if (password === '') {
    submitErrorMessage.value = '新しいパスワードを入力してください。'
    return false
  }
  if (password.length < 8) {
    submitErrorMessage.value = '新しいパスワードは8文字以上で入力してください。'
    return false
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    submitErrorMessage.value = '新しいパスワードは英字と数字をそれぞれ1文字以上含めてください。'
    return false
  }
  if (password !== passwordConfirmation) {
    submitErrorMessage.value = '確認用パスワードが一致しません。'
    return false
  }

  return true
}

async function handleSubmit() {
  submitErrorMessage.value = ''
  if (!validatePassword()) {
    return
  }

  try {
    await completeMutation.mutateAsync({
      userId: userId.value,
      token: token.value,
      password: form.password.trim(),
      passwordConfirmation: form.passwordConfirmation.trim()
    })
    completed.value = true
    form.password = ''
    form.passwordConfirmation = ''
  } catch (error) {
    submitErrorMessage.value = extractFirstErrorMessage(error)
  }
}

onMounted(() => {
  void verifyResetURL()
})
</script>

<template>
  <NarrowPageLayout class="space-y-6 py-8">
    <section class="mx-auto w-full max-w-[800px] rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">パスワードの再設定</h1>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p v-if="verifyMutation.isPending.value" class="text-muted">再設定URLを確認しています...</p>
        <p
          v-else-if="verificationErrorMessage"
          class="rounded border border-danger bg-danger-light px-4 py-3 text-danger"
        >
          {{ verificationErrorMessage }}
        </p>
        <template v-else-if="completed">
          <p class="rounded border border-success bg-success-light px-4 py-3 text-success">
            パスワードを再設定しました。新しいパスワードでログインしてください。
          </p>
          <div class="pt-2 text-center">
            <RouterLink
              class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
              to="/login"
            >
              ログイン画面へ
            </RouterLink>
          </div>
        </template>
        <form id="password-reset-complete-form" v-else class="space-y-5" @submit.prevent="handleSubmit">
          <p v-if="submitErrorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-danger">
            {{ submitErrorMessage }}
          </p>
          <div class="grid gap-2">
            <label class="font-semibold text-body" for="reset-password">新しいパスワード</label>
            <p class="text-xs text-muted">8文字以上で入力してください</p>
            <input
              id="reset-password"
              v-model="form.password"
              autocomplete="new-password"
              name="password"
              placeholder="8文字以上（英字・数字を含む）"
              required
              type="password"
            />
          </div>
          <div class="grid gap-2">
            <label class="font-semibold text-body" for="reset-password-confirmation">新しいパスワード（確認）</label>
            <p class="text-xs text-muted">確認のため、パスワードをもう一度入力してください</p>
            <input
              id="reset-password-confirmation"
              v-model="form.passwordConfirmation"
              autocomplete="new-password"
              name="passwordConfirmation"
              required
              type="password"
            />
          </div>
        </form>
      </div>
    </section>
    <div v-if="!verificationErrorMessage && !verifyMutation.isPending.value && !completed" class="pt-2 text-center">
      <button
        class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline disabled:opacity-60"
        :disabled="completeMutation.isPending.value"
        form="password-reset-complete-form"
        type="submit"
      >
        {{ completeMutation.isPending.value ? '再設定中...' : '新しいパスワードを設定' }}
      </button>
    </div>
    <div v-if="verificationErrorMessage" class="pt-2 text-center">
      <RouterLink
        class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
        to="/password/reset"
      >
        再設定メールを再送する
      </RouterLink>
    </div>
  </NarrowPageLayout>
</template>
