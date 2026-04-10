<script setup lang="ts">
import AnswerQuestionFields from '@/components/forms/AnswerQuestionFields.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import LoadingState from '@/components/ui/LoadingState.vue'
import { updateDraftValue } from '@/features/forms/answers'
import { useWorkspaceFormDetailPage } from '@/features/forms/composables/useWorkspaceFormDetailPage'
import PageMarkdownContent from '@/features/pages/components/PageMarkdownContent.vue'
import { useSessionStore } from '@/features/session/store'
import { formatDateTime, formatDateTimeUpdated } from '@/lib/format/datetime'
import { buttonVariants } from '@/lib/ui/variants'
import { computed } from 'vue'

const { formId: currentFormId, selectedAnswerId: currentSelectedAnswerId } = defineProps<{
  formId: string
  selectedAnswerId: string
}>()

const emit = defineEmits<{
  selectAnswer: [answerId: string]
  clearSelectedAnswer: []
}>()

const sessionStore = useSessionStore()

const {
  answers,
  circleNotApprovedMessage,
  confirmationMessage,
  createAnswer,
  createAnswerMutation,
  draft,
  errorMessage,
  form,
  formQuery,
  handleFileChange,
  hasReachedAnswerLimit,
  isCircleApproved,
  isFormWritable,
  isLimitedPublic,
  isSavingAnswer,
  resolveUploadDownloadHref,
  saveAnswer,
  selectAnswer,
  selectedAnswer,
  selectedAnswerId,
  uploadErrorMessages,
  uploadFile,
  uploadMutation
} = useWorkspaceFormDetailPage({
  formId: () => currentFormId,
  selectedAnswerId: () => currentSelectedAnswerId,
  onSelectAnswer: async (answerId) => emit('selectAnswer', answerId),
  onClearSelectedAnswer: async () => emit('clearSelectedAnswer')
})

const currentCircleLabel = computed(() => sessionStore.currentCircle?.name ?? '')
const shouldShowMultiAnswerControls = computed(() => (form?.value?.maxAnswers ?? 1) > 1 || answers.value.length > 0)
const remainingAnswerCount = computed(() => {
  if (!form.value) {
    return 0
  }
  return Math.max(form.value.maxAnswers - answers.value.length, 0)
})
</script>

<template>
  <PageLayout>
    <section class="pb-6">
      <LoadingState v-if="formQuery.isPending.value" class="mt-6" />

      <template v-else-if="form">
        <form class="space-y-6 py-6" @submit.prevent="saveAnswer">
          <header class="space-y-4">
            <div>
              <RouterLink to="/workspace/forms" class="text-sm text-primary hover:underline">申請</RouterLink>
              <h1 class="text-3xl font-semibold text-body">{{ form.name }}</h1>
              <p class="mt-3 text-sm text-muted">
                受付期間 : {{ formatDateTime(form.openAt) }}〜{{ formatDateTime(form.closeAt) }}
              </p>
              <p v-if="!form.isOpen" class="mt-1 text-sm font-semibold text-danger">受付期間外です</p>
              <p v-if="form.maxAnswers > 1" class="mt-1 text-sm text-muted">
                1企画あたり {{ form.maxAnswers }} 件まで回答できます。
              </p>
            </div>

            <PageMarkdownContent v-if="form.description" :source="form.description" />

            <AlertMessage v-if="isLimitedPublic" tone="info">
              <span
                class="mr-2 inline-flex rounded border border-primary/20 px-2 py-0.5 text-xs font-semibold text-primary"
              >
                限定公開
              </span>
              このフォームは、{{ form.answerableTags.join(' / ') }} のタグを持つ企画に限定公開されます。
            </AlertMessage>
          </header>

          <AlertMessage v-if="!isCircleApproved" tone="danger">
            {{ circleNotApprovedMessage }}
          </AlertMessage>

          <div
            v-if="selectedAnswer?.updatedAt"
            class="rounded border border-border bg-surface px-6 py-5 text-sm text-muted shadow-lv1"
          >
            回答の最終更新日時 : {{ formatDateTime(selectedAnswer.updatedAt) }}
          </div>

          <AlertMessage v-if="selectedAnswer && confirmationMessage" tone="success" class="px-6 py-5 text-body">
            <p class="font-semibold text-success">回答後メッセージ</p>
            <PageMarkdownContent class="mt-2" :source="confirmationMessage" />
          </AlertMessage>

          <div class="rounded border border-border bg-surface px-6 py-5 shadow-lv1">
            <label class="grid gap-2 text-sm text-body">
              <span>申請企画名</span>
              <input :value="currentCircleLabel" readonly type="text" />
            </label>
          </div>

          <section v-if="answers.length > 0" class="rounded border border-border bg-surface px-6 py-5 shadow-lv1">
            <div class="grid gap-3">
              <div>
                <p class="text-sm font-semibold text-body">以前の回答を閲覧・変更</p>
                <p v-if="form.isOpen" class="mt-1 text-sm text-muted">受付期間内に限り、回答の変更ができます</p>
              </div>
              <div class="flex flex-wrap gap-3">
                <button
                  v-for="answer in answers"
                  :key="answer.id"
                  type="button"
                  class="rounded border px-4 py-2 text-sm transition"
                  :class="
                    selectedAnswerId === answer.id
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border bg-surface text-body hover:bg-surface-light'
                  "
                  @click="selectAnswer(answer.id)"
                >
                  {{ formatDateTime(answer.updatedAt) }} に新規作成した回答 — 回答ID : {{ answer.id }}
                </button>
              </div>
            </div>
          </section>

          <section
            v-if="shouldShowMultiAnswerControls"
            class="rounded border border-border bg-surface px-6 py-5 shadow-lv1"
          >
            <div class="grid gap-3">
              <div>
                <p class="text-sm font-semibold text-body">回答を新規作成</p>
                <p v-if="remainingAnswerCount > 0" class="mt-1 text-sm text-muted">
                  貴企画はこの申請を、あと{{ remainingAnswerCount }}つ新規作成できます
                </p>
                <p v-else class="mt-1 text-sm text-muted">
                  回答数上限({{
                    form.maxAnswers
                  }}つ)に達したため、これ以上新規作成できません。以前の回答の編集は上記より可能です。
                </p>
              </div>
              <div>
                <button
                  :class="buttonVariants({ variant: 'secondary', size: 'md' })"
                  :disabled="!isFormWritable || hasReachedAnswerLimit || createAnswerMutation.isPending.value"
                  type="button"
                  @click="createAnswer"
                >
                  {{ createAnswerMutation.isPending.value ? '作成中...' : '新しい回答を作成' }}
                </button>
              </div>
            </div>
          </section>

          <div class="overflow-hidden rounded border border-border bg-surface shadow-lv1">
            <div v-if="selectedAnswer" class="border-b border-border px-6 py-5 text-sm text-body">
              <p class="font-semibold">
                {{ form.isOpen ? '回答を編集' : '回答を閲覧' }} — 回答ID : {{ selectedAnswer.id }}
              </p>
            </div>

            <div class="grid gap-0">
              <template v-if="form.questions.length === 0">
                <div class="border-b border-border px-6 py-5 last:border-b-0">
                  <label class="grid gap-2 text-sm text-body">
                    <span>回答</span>
                    <textarea
                      :value="typeof draft['legacy-body'] === 'string' ? draft['legacy-body'] : ''"
                      class="min-h-40"
                      name="answer-body"
                      :disabled="!isFormWritable"
                      placeholder="回答内容を入力してください"
                      @input="updateDraftValue(draft, 'legacy-body', ($event.target as HTMLTextAreaElement).value)"
                    />
                  </label>
                </div>
              </template>

              <template v-for="question in form.questions" :key="question.id">
                <div v-if="question.type === 'heading'" class="border-b border-border px-6 py-5 last:border-b-0">
                  <h2 class="text-lg font-semibold text-body">{{ question.name }}</h2>
                  <p v-if="question.description" class="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {{ question.description }}
                  </p>
                </div>

                <div v-else class="border-b border-border px-6 py-5 last:border-b-0">
                  <div class="grid gap-3">
                    <div>
                      <p class="text-sm font-semibold text-body">
                        {{ question.name }}
                        <span v-if="question.isRequired" class="ml-2 text-xs font-semibold text-danger">必須</span>
                      </p>
                      <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                        {{ question.description }}
                      </p>
                    </div>

                    <AnswerQuestionFields
                      :answer="selectedAnswer"
                      :draft="draft"
                      :question="question"
                      :disabled="!isFormWritable"
                      upload-button-label="ファイルを追加"
                      :upload-pending="uploadMutation.isPending.value"
                      :upload-error-message="uploadErrorMessages[question.id]"
                      :download-label="selectedAnswerId ? 'ダウンロード' : '表示'"
                      :download-href="(currentQuestion) => resolveUploadDownloadHref(currentQuestion.id)"
                      @upload="uploadFile"
                      @file-change="handleFileChange"
                    />
                  </div>
                </div>
              </template>
            </div>
          </div>

          <AlertMessage v-if="errorMessage" tone="danger">
            {{ errorMessage }}
          </AlertMessage>

          <div class="flex justify-center">
            <button
              :class="buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' })"
              :disabled="!isFormWritable || isSavingAnswer"
              type="submit"
            >
              {{ isSavingAnswer ? '送信中...' : '送信' }}
            </button>
          </div>
        </form>
      </template>

      <ErrorState v-else message="フォームを取得できませんでした。" compact />
    </section>
  </PageLayout>
</template>
