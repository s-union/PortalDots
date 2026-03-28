<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    noDrawer: true,
    noBottomTabs: true
  }
})

import { computed, reactive, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import {
  extractFirstErrorMessage,
  useAuthVerificationStatusQuery,
  useConfirmAuthVerificationMutation,
  useRequestAuthVerificationMutation
} from '@/features/auth/api'

const route = useRoute()
const router = useRouter()
const isIndexRoute = computed(() => route.path === '/email/verify')
const statusQuery = useAuthVerificationStatusQuery(isIndexRoute)
const requestMutation = useRequestAuthVerificationMutation()
const confirmMutation = useConfirmAuthVerificationMutation()
const verifyCode = reactive<Record<'email' | 'univemail', string>>({
  email: '',
  univemail: ''
})
const requestResult = ref<{ type: 'email' | 'univemail'; code: string; message: string } | null>(null)
const errorMessage = ref('')

async function handleRequest(type: 'email' | 'univemail') {
  errorMessage.value = ''

  try {
    const result = await requestMutation.mutateAsync(type)
    requestResult.value = {
      type,
      code: result.verifyCode,
      message: result.message
    }
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}

async function handleConfirm(type: 'email' | 'univemail') {
  errorMessage.value = ''

  try {
    await confirmMutation.mutateAsync({
      type,
      verifyCode: verifyCode[type]
    })
    verifyCode[type] = ''
    await statusQuery.refetch()
    if (statusQuery.data.value?.completed) {
      await router.replace('/email/verify/completed')
    }
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}
</script>

<template>
  <section v-if="isIndexRoute" class="mx-auto w-full max-w-[880px] space-y-6 px-6 py-8">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">まだユーザー登録は完了していません！</h1>
      </div>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p v-if="statusQuery.data.value">
          <strong>{{ statusQuery.data.value.displayName }}</strong> としてログイン中です。
        </p>
        <p>連絡先メールアドレスと大学メールアドレスの両方を認証すると、企画参加登録を進められます。</p>
        <p>
          <RouterLink class="font-semibold text-primary hover:underline" to="/workspace/settings"
            >登録情報の変更</RouterLink
          >
        </p>
        <p v-if="errorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-danger">
          {{ errorMessage }}
        </p>
      </div>
    </section>

    <section
      v-if="statusQuery.isPending.value"
      class="rounded border border-border bg-surface px-6 py-6 text-sm text-muted shadow-lv1"
    >
      読み込み中...
    </section>

    <section
      v-for="item in statusQuery.data.value?.items ?? []"
      :key="item.type"
      class="rounded border border-border bg-surface shadow-lv1"
    >
      <div class="border-b border-border px-6 py-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-body">{{ item.label }}</h2>
            <p class="mt-1 text-sm text-muted">{{ item.address }}</p>
          </div>
          <span
            class="rounded px-3 py-1 text-xs font-semibold"
            :class="item.verified ? 'bg-success-light text-success' : 'bg-warning-light text-warning'"
          >
            {{ item.verified ? '認証済み' : '未認証' }}
          </span>
        </div>
      </div>

      <div class="space-y-4 px-6 py-6">
        <button
          class="rounded border border-primary bg-primary px-4 py-2 text-sm text-white transition hover:bg-primary-hover disabled:opacity-60"
          :disabled="item.verified || requestMutation.isPending.value"
          type="button"
          @click="handleRequest(item.type)"
        >
          {{ item.verified ? '認証済み' : '認証コードを表示' }}
        </button>

        <div
          v-if="requestResult?.type === item.type && requestResult.code"
          class="rounded border border-primary/20 bg-primary-light px-4 py-3 text-sm text-body"
        >
          <p>{{ requestResult.message }}</p>
          <p class="mt-2 font-semibold">認証コード: {{ requestResult.code }}</p>
        </div>

        <div v-if="!item.verified" class="flex flex-col gap-3 sm:flex-row">
          <input
            v-model="verifyCode[item.type]"
            class="min-w-0 flex-1"
            :name="`${item.type}-verify-code`"
            placeholder="6桁の認証コード"
            type="text"
          />
          <button
            class="rounded border border-border bg-surface px-4 py-2 text-sm font-semibold text-body transition hover:bg-surface-light disabled:opacity-60"
            :disabled="confirmMutation.isPending.value"
            type="button"
            @click="handleConfirm(item.type)"
          >
            {{ confirmMutation.isPending.value ? '認証中...' : '認証する' }}
          </button>
        </div>
      </div>
    </section>
  </section>
  <RouterView v-else />
</template>
