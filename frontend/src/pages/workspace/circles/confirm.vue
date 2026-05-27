<script setup lang="ts">
definePage({
  path: '/workspace/circles/confirm',
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, defineAsyncComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import AlertMessage from '@/components/ui/AlertMessage.vue'
const PageMarkdownContent = defineAsyncComponent(() => import('@/features/pages/components/PageMarkdownContent.vue'))
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import CircleRegistrationSteps from '@/features/circles/components/CircleRegistrationSteps.vue'
import { useCurrentCircleDetailQuery, useSubmitCircleMutation } from '@/features/circles/queries'
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
const totalSteps = computed(() => (requiresMemberStep.value ? 3 : 2))

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
  <PageLayout spacious>
    <SurfaceCard tag="header">
      <SurfaceCardBand borderless>
        <div class="space-y-1">
          <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">
            {{ detailQuery.data.value?.participationTypeName ?? '企画' }} 参加登録
            <small class="ml-2 text-sm font-normal text-muted"> (ステップ {{ totalSteps }} / {{ totalSteps }}) </small>
          </h1>
          <p v-if="detailQuery.data.value" class="text-sm text-muted">
            {{ detailQuery.data.value.name }}
          </p>
        </div>
        <CircleRegistrationSteps :current-step="3" :requires-member-step="requiresMemberStep" />
      </SurfaceCardBand>
    </SurfaceCard>

    <div v-if="detailQuery.isPending.value" class="text-sm text-muted">読み込み中...</div>

    <template v-else-if="detailQuery.data.value">
      <SurfaceCard>
        <div class="grid gap-4 px-6 py-6 text-sm text-body">
          <div>
            <p class="font-semibold">参加登録の提出</p>
            <p class="mt-1 text-muted">
              以下の情報で参加登録を提出します。参加登録の提出後は、登録内容の変更ができなくなります。
            </p>
          </div>
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
              <PageMarkdownContent
                v-else-if="question.type === 'markdown'"
                class="mt-3 rounded border border-border bg-surface p-3"
                :source="answerText(question.id)"
              />
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
          {{ requiresMemberStep ? '「メンバーを招待」へもどる' : '企画情報の編集' }}
        </RouterLink>
        <button
          :class="buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' })"
          :disabled="
            submitMutation.isPending.value || !detailQuery.data.value.isLeader || !detailQuery.data.value.canSubmit
          "
          type="button"
          @click="handleSubmit"
        >
          {{ submitMutation.isPending.value ? '提出中...' : '参加登録を提出' }}
        </button>
      </div>
    </template>
  </PageLayout>
</template>
