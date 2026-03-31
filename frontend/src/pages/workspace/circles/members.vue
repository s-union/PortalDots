<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, ref, shallowRef, watchEffect } from 'vue'
import { renderSVG } from 'uqr'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BackLink from '@/components/ui/BackLink.vue'
import LoadingMessage from '@/components/ui/LoadingMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import CircleRegistrationSteps from '@/features/circles/components/CircleRegistrationSteps.vue'
import {
  useCurrentCircleDetailQuery,
  useCircleMembersQuery,
  useRemoveMemberMutation,
  useRegenerateInvitationTokenMutation
} from '@/features/circles/api'
import { useSessionStore } from '@/features/session/store'
import { buttonVariants } from '@/lib/ui/variants'

const sessionStore = useSessionStore()
const detailQuery = useCurrentCircleDetailQuery()
const membersQuery = useCircleMembersQuery()
const removeMutation = useRemoveMemberMutation()
const regenerateMutation = useRegenerateInvitationTokenMutation()

const copySuccess = shallowRef(false)
const errorMessage = shallowRef('')

const currentUserId = computed(() => sessionStore.user?.id ?? '')
const memberRequirementText = computed(() => {
  const detail = detailQuery.data.value
  if (!detail) {
    return ''
  }
  return `${detail.usersCountMin}〜${detail.usersCountMax}人`
})
const canProceedToConfirm = computed(() => detailQuery.data.value?.canSubmit ?? false)

const invitationUrl = computed(() => {
  const token = detailQuery.data.value?.invitationToken
  if (!token) {
    return ''
  }
  return `${window.location.origin}/circles/join/${token}`
})

const isCurrentUserLeader = computed(() => {
  return membersQuery.data.value?.some((m) => m.userId === currentUserId.value && m.isLeader) ?? false
})

const invitationQrSvg = shallowRef('')
const invitationQrError = shallowRef('')
watchEffect(() => {
  const url = invitationUrl.value
  invitationQrError.value = ''
  if (!url) {
    invitationQrSvg.value = ''
    return
  }
  try {
    const renderedSvg = renderSVG(url)
    if (renderedSvg.trim() === '') {
      invitationQrSvg.value = ''
      invitationQrError.value = 'QRコードの生成に失敗しました。招待URLをそのまま共有してください。'
      return
    }
    invitationQrSvg.value = renderedSvg
  } catch {
    invitationQrSvg.value = ''
    invitationQrError.value = 'QRコードの生成に失敗しました。招待URLをそのまま共有してください。'
  }
})

const canShare = computed(
  () =>
    Boolean(invitationUrl.value) &&
    typeof navigator.share === 'function' &&
    (navigator.canShare?.({ url: invitationUrl.value }) ?? true)
)

async function handleShare() {
  try {
    await navigator.share({ url: invitationUrl.value })
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      errorMessage.value = 'URLの共有に失敗しました。'
    }
  }
}

async function handleCopyUrl() {
  if (!invitationUrl.value) {
    return
  }
  await navigator.clipboard.writeText(invitationUrl.value)
  copySuccess.value = true
  setTimeout(() => {
    copySuccess.value = false
  }, 2000)
}

async function handleRegenerate() {
  if (!confirm('招待URLを再生成します。現在の招待URLは無効になります。よろしいですか？')) {
    return
  }
  errorMessage.value = ''

  try {
    await regenerateMutation.mutateAsync()
  } catch {
    errorMessage.value = '招待トークンの再生成に失敗しました。'
  }
}

async function handleRemoveMember(userId: string, displayName: string) {
  if (!confirm(`${displayName} をメンバーから削除しますか？`)) {
    return
  }
  errorMessage.value = ''

  try {
    await removeMutation.mutateAsync(userId)
  } catch {
    errorMessage.value = 'メンバーの削除に失敗しました。'
  }
}
</script>

<template>
  <PageLayout>
    <BackLink to="/workspace/circles/detail"> 企画情報へ戻る </BackLink>

    <SurfaceCard tag="header">
      <SurfaceCardBand borderless>
        <CircleRegistrationSteps :current-step="2" :requires-member-step="true" />
        <p class="mt-3 text-sm leading-7 text-muted">
          招待リンクの確認やメンバーの管理を行い、人数条件を満たしたら確認画面へ進みます。
        </p>
      </SurfaceCardBand>
    </SurfaceCard>

    <SurfaceCard v-if="detailQuery.data.value">
      <p class="text-sm font-semibold text-body">必要人数</p>
      <p class="mt-2 text-sm text-muted">
        現在 {{ detailQuery.data.value.memberCount }} 人 / 条件 {{ memberRequirementText }}
      </p>
      <p class="mt-2 text-sm" :class="canProceedToConfirm ? 'text-success' : 'text-warning'">
        {{
          canProceedToConfirm
            ? '人数条件を満たしています。確認画面へ進めます。'
            : '人数条件を満たしていません。メンバーを追加または整理してください。'
        }}
      </p>
    </SurfaceCard>

    <SettingsSection title="招待リンク">
      <SettingsRow>
        <div class="grid gap-3">
          <p class="text-sm text-muted">このリンクを共有することで、メンバーを招待できます。</p>
          <div v-if="detailQuery.isPending.value" class="text-sm text-muted">読み込み中...</div>
          <template v-else>
            <div class="flex items-center gap-2">
              <input :value="invitationUrl" type="text" readonly class="flex-1 font-mono text-xs" />
              <button
                :class="buttonVariants({ variant: 'primaryInverse', size: 'md', weight: 'bold' })"
                type="button"
                @click="handleCopyUrl"
              >
                {{ copySuccess ? 'コピー完了!' : 'コピー' }}
              </button>
              <button
                v-if="canShare"
                :class="buttonVariants({ variant: 'primaryInverse', size: 'md', weight: 'bold' })"
                type="button"
                @click="handleShare"
              >
                共有
              </button>
            </div>
            <p v-if="invitationQrError" class="text-sm text-warning">{{ invitationQrError }}</p>
            <div v-if="invitationQrSvg" class="flex justify-center" v-html="invitationQrSvg" />
          </template>
        </div>
      </SettingsRow>

      <template v-if="isCurrentUserLeader" #footer>
        <div class="flex justify-end">
          <button
            :class="buttonVariants({ variant: 'secondary', size: 'md' })"
            :disabled="regenerateMutation.isPending.value"
            type="button"
            @click="handleRegenerate"
          >
            {{ regenerateMutation.isPending.value ? '再生成中...' : '招待URLを再生成' }}
          </button>
        </div>
      </template>
    </SettingsSection>

    <SettingsSection title="メンバー一覧">
      <LoadingMessage v-if="membersQuery.isPending.value" />

      <div v-else-if="membersQuery.data.value?.length === 0" class="px-6 py-6 text-sm text-muted">
        メンバーがいません。
      </div>

      <div v-else class="divide-y divide-border">
        <div
          v-for="member in membersQuery.data.value"
          :key="member.userId"
          class="flex items-center justify-between px-6 py-4"
        >
          <div>
            <p class="font-semibold text-body">{{ member.displayName }}</p>
            <p class="mt-1 text-xs text-muted">
              {{ member.isLeader ? 'リーダー' : 'メンバー' }}
            </p>
          </div>
          <button
            v-if="!member.isLeader && (isCurrentUserLeader || member.userId === currentUserId)"
            :class="buttonVariants({ variant: 'dangerOutline', size: 'sm', weight: 'bold' })"
            :disabled="removeMutation.isPending.value"
            type="button"
            @click="handleRemoveMember(member.userId, member.displayName)"
          >
            削除
          </button>
        </div>
      </div>

      <template v-if="errorMessage" #footer>
        <AlertMessage tone="danger">
          {{ errorMessage }}
        </AlertMessage>
      </template>
    </SettingsSection>

    <div
      v-if="detailQuery.data.value?.isLeader && detailQuery.data.value.submittedAt === null"
      class="flex justify-end"
    >
      <RouterLink
        :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' })"
        :to="canProceedToConfirm ? '/workspace/circles/confirm' : '/workspace/circles/detail'"
      >
        {{ canProceedToConfirm ? '確認画面へ進む' : '入力画面へ戻る' }}
      </RouterLink>
    </div>
  </PageLayout>
</template>
