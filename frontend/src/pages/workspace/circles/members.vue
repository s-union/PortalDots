<script setup lang="ts">
definePage({
  path: '/workspace/circles/members',
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, shallowRef, watchEffect } from 'vue'
import { renderSVG } from 'uqr'
import AlertMessage from '@/components/ui/AlertMessage.vue'
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
} from '@/features/circles/queries'
import { useSessionStore } from '@/features/session/store'
import { buttonVariants } from '@/lib/ui/variants'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'

const sessionStore = useSessionStore()
const detailQuery = useCurrentCircleDetailQuery()
const membersQuery = useCircleMembersQuery()
const removeMutation = useRemoveMemberMutation()
const regenerateMutation = useRegenerateInvitationTokenMutation()

const copySuccess = shallowRef(false)
const errorMessage = shallowRef('')

const currentUserId = computed(() => sessionStore.user?.id ?? '')
const canProceedToConfirm = computed(() => detailQuery.data.value?.canSubmit ?? false)
const memberRequirementMessage = computed(() => {
  const detail = detailQuery.data.value
  if (!detail) {
    return ''
  }

  const shortage = detail.usersCountMin - detail.memberCount
  if (shortage > 0) {
    return `企画参加登録を提出するには、あと${shortage}人がメンバーになる必要があります。`
  }

  const extra = detail.memberCount - detail.usersCountMax
  if (extra > 0) {
    return `企画参加登録を提出するには、メンバーを${extra}人減らす必要があります。`
  }

  return ''
})

const invitationUrl = computed(() => {
  const token = detailQuery.data.value?.invitationToken
  if (!token) {
    return ''
  }
  return `${window.location.origin}/circles/join/${encodeURIComponent(token)}`
})

const isCurrentUserLeader = computed(() => {
  return membersQuery.data.value?.some((m) => m.userId === currentUserId.value && m.isLeader) ?? false
})

const invitationQrDataUrl = shallowRef('')
const invitationQrError = shallowRef('')
watchEffect(() => {
  const url = invitationUrl.value
  invitationQrError.value = ''
  if (!url) {
    invitationQrDataUrl.value = ''
    return
  }
  try {
    const renderedSvg = renderSVG(url)
    const normalizedSvg = renderedSvg.trim()
    if (normalizedSvg === '' || !normalizedSvg.startsWith('<svg')) {
      invitationQrDataUrl.value = ''
      invitationQrError.value = 'QRコードの生成に失敗しました。招待URLをそのまま共有してください。'
      return
    }
    invitationQrDataUrl.value = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`
  } catch {
    invitationQrDataUrl.value = ''
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
  if (!invitationUrl.value) {
    return
  }

  try {
    if (canShare.value) {
      await navigator.share({ url: invitationUrl.value })
      return
    }

    await navigator.clipboard.writeText(invitationUrl.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      errorMessage.value = 'URLの共有に失敗しました。'
    }
  }
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
  <PageLayout spacious>
    <SurfaceCard tag="header">
      <SurfaceCardBand borderless>
        <div class="space-y-1">
          <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">
            {{ detailQuery.data.value?.participationTypeName ?? '企画' }} 参加登録
            <small class="ml-2 text-sm font-normal text-muted"> (ステップ 2 / 3) </small>
          </h1>
          <p v-if="detailQuery.data.value" class="text-sm text-muted">
            {{ detailQuery.data.value.name }}
          </p>
        </div>
        <CircleRegistrationSteps :current-step="2" :requires-member-step="true" />
      </SurfaceCardBand>
    </SurfaceCard>

    <SettingsSection title="招待リンク">
      <SettingsRow>
        <div class="grid gap-3">
          <p class="text-sm text-muted">
            あなたの企画「{{ detailQuery.data.value?.name ?? '' }}」の学園祭係(副責任者)に、このURLを共有してください。
          </p>
          <div v-if="detailQuery.isPending.value" class="text-sm text-muted">読み込み中...</div>
          <template v-else>
            <div class="flex items-center gap-2">
              <input
                :value="invitationUrl"
                type="text"
                readonly
                aria-label="招待URL"
                class="flex-1 font-mono text-xs"
              />
              <button
                :class="buttonVariants({ variant: 'primaryInverse', size: 'md', weight: 'bold' })"
                type="button"
                @click="handleShare"
              >
                {{ copySuccess ? 'コピー完了!' : 'URLを共有' }}
              </button>
            </div>
            <p v-if="invitationQrError" class="text-sm text-warning">{{ invitationQrError }}</p>
            <div v-if="invitationQrDataUrl" class="flex justify-center">
              <img :src="invitationQrDataUrl" alt="招待URLのQRコード" class="h-44 w-44" />
            </div>
          </template>
        </div>
      </SettingsRow>

      <template v-if="isCurrentUserLeader" #footer>
        <ActionsFooter align="end">
          <button
            :class="buttonVariants({ variant: 'secondary', size: 'md' })"
            :disabled="regenerateMutation.isPending.value"
            type="button"
            @click="handleRegenerate"
          >
            {{ regenerateMutation.isPending.value ? '再生成中...' : '招待URLを再生成' }}
          </button>
        </ActionsFooter>
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

    <div v-if="detailQuery.data.value?.isLeader && detailQuery.data.value.submittedAt === null" class="space-y-3">
      <p v-if="memberRequirementMessage" class="text-sm text-danger">
        {{ memberRequirementMessage }}
      </p>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <RouterLink
          class="inline-flex rounded border border-border bg-surface px-4 py-3 text-sm font-semibold text-body transition hover:bg-surface-light hover:no-underline"
          to="/workspace/circles/detail"
        >
          企画情報の編集
        </RouterLink>
        <RouterLink
          :class="
            buttonVariants({ variant: canProceedToConfirm ? 'primary' : 'secondary', size: 'lg', weight: 'bold' })
          "
          :to="canProceedToConfirm ? '/workspace/circles/confirm' : '/workspace/circles/detail'"
        >
          {{ canProceedToConfirm ? '確認画面へ' : '入力画面へ戻る' }}
        </RouterLink>
      </div>
    </div>
  </PageLayout>
</template>
