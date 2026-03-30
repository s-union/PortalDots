<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import CircleRegistrationSteps from '@/features/circles/components/CircleRegistrationSteps.vue'
import { useCurrentCircleDetailQuery, useSubmitCircleMutation } from '@/features/circles/api'
import { extractValidationMessage } from '@/lib/api/validation'
import { buttonVariants } from '@/lib/ui/variants'

const router = useRouter()
const detailQuery = useCurrentCircleDetailQuery()
const submitMutation = useSubmitCircleMutation()
const errorMessage = ref('')

const requiresMemberStep = computed(() => {
  const detail = detailQuery.data.value
  if (!detail) {
    return false
  }
  return detail.usersCountMax > 1
})

async function handleSubmit() {
  const detail = detailQuery.data.value
  if (!detail) {
    return
  }

  errorMessage.value = ''

  try {
    await submitMutation.mutateAsync({
      lastUpdatedAt: detail.lastUpdatedAt
    })
    await router.push('/workspace/circles/done')
  } catch (error) {
    errorMessage.value = extractValidationMessage(error, '参加登録の提出に失敗しました。')
  }
}

function answerText(questionId: string) {
  const detail = detailQuery.data.value
  const values = detail?.answer?.details[questionId] ?? []
  return values.length > 0 ? values.join(' / ') : '未入力'
}

function uploadNames(questionId: string) {
  const detail = detailQuery.data.value
  return (detail?.answer?.uploads ?? [])
    .filter((upload) => upload.questionId === questionId)
    .map((upload) => upload.filename)
}
</script>

<template>
  <PageLayout>
    <SurfaceCard tag="header">
      <SurfaceCardBand borderless>
        <CircleRegistrationSteps :current-step="3" :requires-member-step="requiresMemberStep" />
        <p class="mt-3 text-sm leading-7 text-muted">入力内容を確認し、問題なければ参加登録を提出してください。</p>
      </SurfaceCardBand>
    </SurfaceCard>

    <div v-if="detailQuery.isPending.value" class="text-sm text-muted">読み込み中...</div>

    <template v-else-if="detailQuery.data.value">
      <SurfaceCard>
        <div class="grid gap-4 px-6 py-6 text-sm text-body">
          <div>
            <p class="font-semibold">企画名</p>
            <p class="mt-1">{{ detailQuery.data.value.name }}</p>
          </div>
          <div>
            <p class="font-semibold">団体名</p>
            <p class="mt-1">{{ detailQuery.data.value.groupName }}</p>
          </div>
          <div>
            <p class="font-semibold">参加種別</p>
            <p class="mt-1">{{ detailQuery.data.value.participationTypeName }}</p>
          </div>
          <div>
            <p class="font-semibold">メンバー数</p>
            <p class="mt-1">
              {{ detailQuery.data.value.memberCount }} 人 ({{ detailQuery.data.value.usersCountMin }}〜{{
                detailQuery.data.value.usersCountMax
              }}
              人)
            </p>
          </div>
          <div v-if="detailQuery.data.value.notes">
            <p class="font-semibold">備考</p>
            <p class="mt-1 whitespace-pre-wrap">{{ detailQuery.data.value.notes }}</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard v-if="detailQuery.data.value.questions.length > 0">
        <div class="grid gap-0">
          <template v-for="question in detailQuery.data.value.questions" :key="question.id">
            <div v-if="question.type === 'heading'" class="border-b border-border px-6 py-5">
              <h4 class="text-base font-semibold text-body">{{ question.name }}</h4>
              <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                {{ question.description }}
              </p>
            </div>

            <div v-else class="border-b border-border px-6 py-5">
              <p class="text-sm font-semibold text-body">{{ question.name }}</p>
              <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                {{ question.description }}
              </p>
              <ul v-if="question.type === 'upload'" class="mt-3 list-disc space-y-1 pl-5 text-sm text-body">
                <li v-for="name in uploadNames(question.id)" :key="name">{{ name }}</li>
                <li v-if="uploadNames(question.id).length === 0" class="list-none text-muted">未アップロード</li>
              </ul>
              <p v-else class="mt-3 whitespace-pre-wrap text-sm text-body">
                {{ answerText(question.id) }}
              </p>
            </div>
          </template>
        </div>
      </SurfaceCard>

      <p v-else class="text-sm text-muted">追加の設問はありません。</p>

      <AlertMessage v-if="errorMessage" tone="danger">
        {{ errorMessage }}
      </AlertMessage>

      <div class="flex flex-wrap justify-end gap-3">
        <RouterLink
          class="inline-flex rounded border border-border bg-surface px-4 py-3 text-sm font-semibold text-body transition hover:bg-surface-light hover:no-underline"
          :to="requiresMemberStep ? '/workspace/circles/members' : '/workspace/circles/detail'"
        >
          戻って修正する
        </RouterLink>
        <button
          :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' })"
          :disabled="
            submitMutation.isPending.value || !detailQuery.data.value.isLeader || !detailQuery.data.value.canSubmit
          "
          type="button"
          @click="handleSubmit"
        >
          {{ submitMutation.isPending.value ? '提出中...' : '参加登録を提出する' }}
        </button>
      </div>
    </template>
  </PageLayout>
</template>
