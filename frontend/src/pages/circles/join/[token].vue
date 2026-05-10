<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import PanelBody from '@/components/ui/PanelBody.vue'
import { useCircleByInvitationTokenQuery, useJoinCircleMutation } from '@/features/circles/api'
import { useSessionStore } from '@/features/session/store'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { routeParamString } from '@/lib/routeQuery'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const joinMutation = useJoinCircleMutation()

const errorMessage = ref('')

const invitationToken = computed(() => routeParamString(route.params, 'token'))
const isAuthenticated = computed(() => sessionStore.isAuthenticated)
const circleQuery = useCircleByInvitationTokenQuery(invitationToken)

async function handleAcceptInvite() {
  errorMessage.value = ''

  if (invitationToken.value === '') {
    errorMessage.value = '招待 URL が不正です。最新の招待リンクを確認してください。'
    return
  }

  try {
    await joinMutation.mutateAsync(invitationToken.value)
    await router.push('/workspace/circles/detail')
  } catch (error) {
    const apiMessage = extractApiMessage(error)

    if (apiMessage === 'already_member') {
      await router.push('/circles/select')
      return
    }

    if (apiMessage === 'invalid_token') {
      errorMessage.value = '招待 URL が無効か、すでに利用できません。最新の招待リンクを共有してもらってください。'
      return
    }

    errorMessage.value = '招待の受け入れに失敗しました。時間をおいて再度お試しください。'
  }
}

function extractApiMessage(error: unknown) {
  if (!(error instanceof Error) || !('cause' in error)) {
    return null
  }

  const cause = error.cause
  if (!cause || typeof cause !== 'object' || !('message' in cause)) {
    return null
  }

  return typeof cause.message === 'string' ? cause.message : null
}
</script>

<template>
  <PageLayout spacious>
    <SurfaceCard>
      <PanelBody spacious class="space-y-4 text-sm leading-7 text-body">
        <h1 class="text-2xl font-semibold text-body">企画招待を受け入れる</h1>

        <div v-if="circleQuery.data.value" class="rounded border border-border bg-surface-light px-4 py-3">
          <p class="text-xs text-muted-2">招待元企画</p>
          <p class="mt-1 text-lg font-semibold text-body">{{ circleQuery.data.value.name }}</p>
          <p class="text-sm text-muted">
            {{ circleQuery.data.value.groupName }} / {{ circleQuery.data.value.participationTypeName }}
          </p>
        </div>

        <p>招待リンクから、このアカウントを企画メンバーとして追加します。</p>
        <p v-if="isAuthenticated">
          現在は <strong>{{ sessionStore.user?.displayName ?? 'ログイン中ユーザー' }}</strong>
          として受け入れます。受け入れ後は企画情報画面へ移動します。
        </p>
        <p v-else>招待を受け入れるには先にログインが必要です。ログイン後にこの URL をもう一度開いてください。</p>

        <ErrorState v-if="errorMessage" :message="errorMessage" />

        <div class="flex flex-wrap gap-3">
          <BaseButton
            variant="primary"
            size="lg"
            weight="bold"
            v-if="isAuthenticated"
            :disabled="joinMutation.isPending.value"
            type="button"
            @click="handleAcceptInvite"
          >
            {{ joinMutation.isPending.value ? '受け入れ中...' : '招待を受け入れる' }}
          </BaseButton>
          <BaseButton v-else to="/login" variant="primary" size="lg" weight="bold"> ログインして続ける </BaseButton>
          <RouterLink
            to="/circles/select"
            class="inline-flex rounded border border-border px-4 py-3 font-semibold text-body transition hover:bg-surface-light"
          >
            企画選択へ
          </RouterLink>
        </div>
      </PanelBody>
    </SurfaceCard>
  </PageLayout>
</template>
