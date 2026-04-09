<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import { computed, reactive, ref } from 'vue'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import { extractFirstErrorMessage, useStartPasswordResetMutation } from '@/features/auth/api'
import { usePublicConfigQuery } from '@/features/public-home/api'

const form = reactive({
  loginId: ''
})
const successMessage = ref('')
const errorMessage = ref('')
const publicConfigQuery = usePublicConfigQuery()
const resetMutation = useStartPasswordResetMutation()
const appName = computed(() => publicConfigQuery.data.value?.appName ?? 'PortalDots')

async function handleSubmit() {
  successMessage.value = ''
  errorMessage.value = ''

  const loginId = form.loginId.trim()
  if (loginId === '') {
    errorMessage.value = '学籍番号または連絡先メールアドレスを入力してください。'
    return
  }

  try {
    const result = await resetMutation.mutateAsync({ loginId })
    successMessage.value = result.message
    form.loginId = ''
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}
</script>

<template>
  <NarrowPageLayout class="space-y-6 py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">パスワードの再設定</h1>
      </div>
      <form class="space-y-4 px-6 py-6 text-sm leading-7 text-body" @submit.prevent="handleSubmit">
        <p>{{ appName }}へのログインに使用していた学籍番号または連絡先メールアドレスを入力してください。</p>
        <p>連絡先メールアドレスに対し、パスワード再設定のためのメールを送信します。</p>
        <p v-if="successMessage" class="rounded border border-success bg-success-light px-4 py-3 text-success">
          {{ successMessage }}
        </p>
        <p v-if="errorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-danger">
          {{ errorMessage }}
        </p>
        <label class="grid gap-2 font-semibold text-body" for="login-id">
          学籍番号または連絡先メールアドレス
          <input id="login-id" v-model="form.loginId" name="loginId" required type="text" />
        </label>
        <div class="pt-2 text-center">
          <button
            class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline disabled:opacity-60"
            :disabled="resetMutation.isPending.value"
            type="submit"
          >
            {{ resetMutation.isPending.value ? '送信中...' : '再設定のためのメールを送信' }}
          </button>
        </div>
      </form>
    </section>
  </NarrowPageLayout>
</template>
