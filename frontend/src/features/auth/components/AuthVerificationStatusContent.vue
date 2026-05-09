<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ErrorState from '@/components/ui/ErrorState.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import { routeString } from '@/lib/routeQuery'
import {
  extractFirstErrorMessage,
  useRequestAuthVerificationMutation,
  useSuspenseAuthVerificationStatusQuery
} from '@/features/auth/api'

const router = useRouter()
const route = useRoute()
const statusQuery = useSuspenseAuthVerificationStatusQuery()
await statusQuery.suspense()
const allAddressesVerified = computed(() =>
  (statusQuery.data.value?.items ?? []).every((item) => item.address.trim() === '' || item.verified)
)

if (statusQuery.data.value?.completed && allAddressesVerified.value) {
  await router.replace('/email/verify/completed')
}

const requestMutation = useRequestAuthVerificationMutation()
const requestResult = ref<{ type: 'email' | 'univemail'; message: string } | null>(null)
const errorMessage = ref('')
const autoSentMessage = computed(() => {
  const sent = routeString(route.query.sent)
  if (sent === 'email') {
    return '連絡先メールアドレスに認証URLを送信しました。メール内のリンクを開いて認証してください。'
  }
  if (sent === 'univemail') {
    return '大学メールアドレスに認証URLを送信しました。メール内のリンクを開いて認証してください。'
  }
  return ''
})

async function handleRequest(type: 'email' | 'univemail') {
  errorMessage.value = ''

  try {
    const result = await requestMutation.mutateAsync(type)
    requestResult.value = {
      type,
      message: result.message
    }
    await statusQuery.refetch()
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}
</script>

<template>
  <SurfaceCard tag="section">
    <SurfaceCardBand>
      <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">まだユーザー登録は完了していません！</h1>
    </SurfaceCardBand>
    <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
      <p v-if="statusQuery.data.value">
        <strong>{{ statusQuery.data.value.displayName }}</strong> としてログイン中です。
      </p>
      <p>連絡用メールアドレスにお知らせを届けるには、連絡先メールアドレスの認証が必要です。</p>
      <p>
        <RouterLink class="font-semibold text-primary hover:underline" to="/workspace/settings"
          >登録情報の変更</RouterLink
        >
      </p>
      <p v-if="autoSentMessage" class="rounded border border-primary/20 bg-primary-light px-4 py-3 text-body">
        {{ autoSentMessage }}
      </p>
      <ErrorState v-if="errorMessage" :message="errorMessage" />
    </div>
  </SurfaceCard>

  <SurfaceCard tag="section" v-for="item in statusQuery.data.value?.items ?? []" :key="item.type">
    <SurfaceCardBand>
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
    </SurfaceCardBand>

    <div class="space-y-4 px-6 py-6">
      <button
        class="rounded border border-primary bg-primary px-4 py-2 text-sm text-white transition hover:bg-primary-hover disabled:opacity-60"
        :disabled="item.verified || requestMutation.isPending.value"
        type="button"
        @click="handleRequest(item.type)"
      >
        {{ item.verified ? '認証済み' : '認証メールを送信' }}
      </button>

      <div
        v-if="requestResult?.type === item.type"
        class="rounded border border-primary/20 bg-primary-light px-4 py-3 text-sm text-body"
      >
        <p>{{ requestResult.message }}</p>
      </div>
    </div>
  </SurfaceCard>
</template>
