<script setup lang="ts">
definePage({
  meta: {
    noDrawer: true,
    noBottomTabs: true
  }
})

import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import { extractFirstErrorMessage, useVerifyAuthVerificationLinkMutation } from '@/features/auth/api'
import ErrorState from '@/components/ui/ErrorState.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import { routeParamString, routeString } from '@/lib/routeQuery'

const route = useRoute()
const verifyType = computed(() => {
  const value = routeParamString(route.params, 'type')
  return value === 'email' || value === 'univemail' ? value : ''
})
const userId = computed(() => routeParamString(route.params, 'userId'))
const token = computed(() => routeString(route.query.token))

const verifyMutation = useVerifyAuthVerificationLinkMutation()
const verificationErrorMessage = ref('')
const verificationCompleted = ref<null | boolean>(null)

async function verifyLink() {
  verificationErrorMessage.value = ''
  verificationCompleted.value = null

  if (verifyType.value === '' || userId.value === '' || token.value.trim() === '') {
    verificationErrorMessage.value = '認証URLが無効か期限切れです。もう一度お試しください。'
    return
  }

  try {
    const result = await verifyMutation.mutateAsync({
      type: verifyType.value,
      userId: userId.value,
      token: token.value
    })
    verificationCompleted.value = result.completed
  } catch (error) {
    verificationErrorMessage.value = extractFirstErrorMessage(error)
  }
}

onMounted(() => {
  void verifyLink()
})
</script>

<template>
  <NarrowPageLayout class="space-y-6 py-8">
    <SurfaceCard tag="section">
      <SurfaceCardBand>
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">メール認証</h1>
      </SurfaceCardBand>
      <div class="space-y-4 px-6 py-6 text-sm leading-7 text-body">
        <p v-if="verifyMutation.isPending.value" class="text-muted">認証URLを確認しています...</p>
        <ErrorState v-if="verificationErrorMessage" :message="verificationErrorMessage" />
        <template v-else-if="verificationCompleted !== null">
          <p class="rounded border border-success bg-success-light px-4 py-3 text-success">
            {{
              verificationCompleted
                ? '必須のメール認証が完了しました。企画参加登録を進められます。'
                : 'メール認証が完了しました。大学メールアドレスを認証すると、企画参加登録を進められます。'
            }}
          </p>
          <div class="pt-2 text-center">
            <RouterLink
              class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm text-white transition hover:bg-primary-hover hover:no-underline"
              to="/email/verify"
            >
              認証状況を確認する
            </RouterLink>
          </div>
        </template>
      </div>
    </SurfaceCard>
  </NarrowPageLayout>
</template>
