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
import {
  extractFirstErrorMessage,
  useCompleteRegistrationMutation,
  useVerifyRegistrationMutation
} from '@/features/auth/api'

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
const errorMessage = ref('')
const form = reactive({
  name: '',
  nameYomi: '',
  contactEmail: '',
  phoneNumber: '',
  password: '',
  passwordConfirmation: ''
})

async function loadVerification() {
  errorMessage.value = ''

  if (verifyType.value !== 'univemail' || pendingRegistrationId.value === 'unknown' || token.value.trim() === '') {
    errorMessage.value = '認証URLが無効か期限切れです。もう一度お試しください。'
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
    errorMessage.value = extractFirstErrorMessage(error)
  }
}

async function handleSubmit() {
  errorMessage.value = ''

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
    await router.replace('/email/verify/completed')
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}

onMounted(() => {
  void loadVerification()
})
</script>

<template>
  <section class="mx-auto w-full max-w-[880px] space-y-6 px-6 py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">ユーザー登録を続ける</h1>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p v-if="verifyMutation.isPending.value" class="text-muted">認証URLを確認しています...</p>
        <p v-else-if="errorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-danger">
          {{ errorMessage }}
        </p>
        <template v-else-if="verification">
          <p>
            大学メールアドレス <strong>{{ verification.univemail }}</strong> の確認が完了しました。
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
              <label class="grid gap-2">
                <span class="font-semibold">名前</span>
                <input v-model="form.name" autocomplete="name" name="name" placeholder="姓 名" required type="text" />
              </label>
              <label class="grid gap-2">
                <span class="font-semibold">名前(よみ)</span>
                <input v-model="form.nameYomi" name="nameYomi" placeholder="せい めい" required type="text" />
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2">
                <span class="font-semibold">連絡先メールアドレス</span>
                <input v-model="form.contactEmail" autocomplete="email" name="contactEmail" type="email" />
              </label>
              <label class="grid gap-2">
                <span class="font-semibold">連絡先電話番号</span>
                <input v-model="form.phoneNumber" autocomplete="tel" name="phoneNumber" required type="tel" />
              </label>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2">
                <span class="font-semibold">パスワード</span>
                <input
                  v-model="form.password"
                  autocomplete="new-password"
                  name="password"
                  placeholder="8文字以上"
                  required
                  type="password"
                />
              </label>
              <label class="grid gap-2">
                <span class="font-semibold">パスワード(確認)</span>
                <input
                  v-model="form.passwordConfirmation"
                  autocomplete="new-password"
                  name="passwordConfirmation"
                  required
                  type="password"
                />
              </label>
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
  </section>
</template>
