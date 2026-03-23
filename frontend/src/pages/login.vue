<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noFooter: true,
    noBottomTabs: true
  }
})

import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { extractFirstErrorMessage, useLoginMutation } from '@/features/auth/api'

const router = useRouter()
const loginMutation = useLoginMutation()
const isSubmitting = computed(() => loginMutation.isPending.value)

const form = reactive({
  loginId: '',
  password: '',
  remember: false
})

const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''

  try {
    await loginMutation.mutateAsync({
      loginId: form.loginId,
      password: form.password,
      remember: form.remember
    })
    await router.replace('/')
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}
</script>

<template>
  <section class="flex min-h-[calc(100dvh-5rem)] flex-col justify-center bg-surface px-6 py-10">
    <div class="mx-auto w-full max-w-[560px]">
      <h1 class="mb-6 text-center text-[2rem] font-semibold text-body">ログイン</h1>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div v-if="errorMessage" class="space-y-2 text-danger">
          <p>{{ errorMessage }}</p>
        </div>

        <div>
          <label class="sr-only" for="login-id">学籍番号または連絡先メールアドレス</label>
          <input
            id="login-id"
            v-model="form.loginId"
            autocomplete="username"
            name="loginId"
            required
            type="text"
            placeholder="学籍番号または連絡先メールアドレス"
          />
        </div>

        <div>
          <label class="sr-only" for="password">パスワード</label>
          <input
            id="password"
            v-model="form.password"
            autocomplete="current-password"
            name="password"
            required
            type="password"
            placeholder="パスワード"
          />
        </div>

        <label class="inline-flex items-center gap-2 text-sm text-body">
          <input v-model="form.remember" name="remember" type="checkbox" />
          ログインしたままにする
        </label>

        <p>
          <RouterLink class="text-primary" to="/password/reset">パスワードをお忘れの場合はこちら</RouterLink>
        </p>

        <div>
          <button
            class="w-full rounded border border-primary bg-primary px-4 py-3 text-sm text-white transition hover:bg-primary-hover"
            :disabled="isSubmitting"
            type="submit"
          >
            <strong>{{ isSubmitting ? 'ログイン中...' : 'ログイン' }}</strong>
          </button>
        </div>

        <p>
          <RouterLink
            class="block w-full rounded border border-border bg-surface px-4 py-3 text-center text-sm text-body transition hover:bg-surface-light hover:no-underline"
            to="/register"
          >
            はじめての方は新規ユーザー登録
          </RouterLink>
        </p>
      </form>
    </div>
  </section>
</template>
