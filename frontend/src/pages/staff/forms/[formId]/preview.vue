<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/:formId/preview',
  meta: staffPageMeta('forms.read')
})

import { computed, ref, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import PageLayout from '@/components/layouts/PageLayout.vue'
import { formatDateTime } from '@/lib/format/datetime'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { useSessionStore } from '@/features/session/store'
import { useStaffStatusQuery } from '@/features/staff/status/api'
import { useStaffFormPreviewQuery, type StaffFormQuestion } from '@/features/staff/forms/api'
import LoadingState from '@/components/ui/LoadingState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import { inputChecked, inputValue, selectValue, textareaValue } from '@/lib/dom'

const route = useRoute('/staff/forms/[formId]/preview')
const sessionStore = useSessionStore()
const publicConfigQuery = usePublicConfigQuery()

const formId = computed(() => String(route.params.formId ?? ''))
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const previewQuery = useStaffFormPreviewQuery(
  formId,
  computed(() => staffStatusQuery.data.value?.authorized === true)
)
const isLimitedPublic = computed(() => (previewQuery.data.value?.answerableTags.length ?? 0) > 0)
const previewPageTitle = computed(() => {
  const formName = previewQuery.data.value?.name?.trim()
  return formName ? `${formName} - プレビュー` : 'プレビュー'
})
const draftValues = ref<Record<string, string | string[]>>({})
const uploadFileNames = ref<Record<string, string>>({})
const submitNoticeVisible = ref(false)

watch(
  () => previewQuery.data.value?.questions ?? [],
  (questions) => {
    draftValues.value = Object.fromEntries(
      questions
        .filter((question) => question.type !== 'heading')
        .map((question) => [question.id, question.type === 'checkbox' ? [] : ''])
    )
    uploadFileNames.value = {}
    submitNoticeVisible.value = false
  },
  { immediate: true }
)

watchEffect(() => {
  if (typeof document === 'undefined') {
    return
  }

  const appName = publicConfigQuery.data.value?.appName ?? 'PortalDots'
  document.title = `${previewPageTitle.value} — ${appName}`
})

function questionValue(questionId: string) {
  return typeof draftValues.value[questionId] === 'string' ? draftValues.value[questionId] : ''
}

function checkboxValue(questionId: string) {
  return Array.isArray(draftValues.value[questionId]) ? draftValues.value[questionId] : []
}

function updateQuestionValue(questionId: string, value: string | string[]) {
  draftValues.value = {
    ...draftValues.value,
    [questionId]: value
  }
  submitNoticeVisible.value = false
}

function handleCheckboxChange(questionId: string, option: string, checked: boolean) {
  const values = checkboxValue(questionId)
  updateQuestionValue(questionId, checked ? [...values, option] : values.filter((value) => value !== option))
}

function handleUploadChange(question: StaffFormQuestion, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  uploadFileNames.value = {
    ...uploadFileNames.value,
    [question.id]: target.files?.[0]?.name ?? ''
  }
  submitNoticeVisible.value = false
}

function handlePreviewSubmit() {
  submitNoticeVisible.value = true
}
</script>

<template>
  <PageLayout fullWidth class="space-y-0 pb-6 max-[1000px]:px-0">
    <div v-if="previewQuery.isPending.value" class="mt-6 px-6 max-[1000px]:px-4">
      <LoadingState />
    </div>

    <template v-else-if="previewQuery.data.value">
      <div class="bg-primary px-6 py-4 text-white shadow-lv1 max-[1000px]:px-4">
        <div class="mx-auto w-full max-w-[960px]">
          <p class="text-lg font-semibold">プレビュー</p>
          <p class="mt-1 text-sm text-white/90">このフォームから実際に送信することはできません。</p>
        </div>
      </div>

      <form
        class="mx-auto w-full max-w-[960px] space-y-6 px-6 py-6 max-[1000px]:px-4"
        @submit.prevent="handlePreviewSubmit"
      >
        <header class="space-y-4">
          <div>
            <h1 class="text-3xl font-semibold text-body">{{ previewQuery.data.value.name }}</h1>
            <p class="mt-3 text-sm text-muted">
              受付期間 : {{ formatDateTime(previewQuery.data.value.openAt) }}〜{{
                formatDateTime(previewQuery.data.value.closeAt)
              }}
            </p>
            <p v-if="!previewQuery.data.value.isOpen" class="mt-1 text-sm font-semibold text-danger">受付期間外です</p>
          </div>

          <p v-if="previewQuery.data.value.description" class="whitespace-pre-wrap text-sm leading-7 text-body">
            {{ previewQuery.data.value.description }}
          </p>

          <div
            v-if="isLimitedPublic"
            class="rounded border border-primary/20 bg-primary-light px-4 py-3 text-sm text-body"
          >
            <span
              class="mr-2 inline-flex rounded border border-primary/20 px-2 py-0.5 text-xs font-semibold text-primary"
            >
              限定公開
            </span>
            このフォームは、{{ previewQuery.data.value.answerableTags.join(' / ') }}
            のタグを持つ企画に限定公開されます。
          </div>
        </header>

        <SurfaceCard overflow-hidden>
          <template v-for="question in previewQuery.data.value.questions" :key="question.id">
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

                <input
                  v-if="question.type === 'text'"
                  class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
                  type="text"
                  :value="questionValue(question.id)"
                  placeholder="一行入力"
                  @input="updateQuestionValue(question.id, inputValue($event))"
                />
                <textarea
                  v-else-if="question.type === 'textarea'"
                  class="min-h-32 rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
                  :value="questionValue(question.id)"
                  placeholder="複数行入力"
                  @input="updateQuestionValue(question.id, textareaValue($event))"
                />
                <input
                  v-else-if="question.type === 'number'"
                  class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
                  type="number"
                  :value="questionValue(question.id)"
                  placeholder="整数入力"
                  @input="updateQuestionValue(question.id, inputValue($event))"
                />
                <select
                  v-else-if="question.type === 'select'"
                  class="rounded border border-border bg-form-control px-4 py-3 text-sm text-body"
                  :value="questionValue(question.id)"
                  @change="updateQuestionValue(question.id, selectValue($event))"
                >
                  <option value="">選択してください</option>
                  <option v-for="option in question.options" :key="option">{{ option }}</option>
                </select>
                <div v-else-if="question.type === 'radio'" class="grid gap-2">
                  <label
                    v-for="option in question.options"
                    :key="option"
                    class="flex items-center gap-3 text-sm text-body"
                  >
                    <input
                      :name="question.id"
                      :value="option"
                      :checked="questionValue(question.id) === option"
                      type="radio"
                      @change="updateQuestionValue(question.id, option)"
                    />
                    <span>{{ option }}</span>
                  </label>
                </div>
                <div v-else-if="question.type === 'checkbox'" class="grid gap-2">
                  <label
                    v-for="option in question.options"
                    :key="option"
                    class="flex items-center gap-3 text-sm text-body"
                  >
                    <input
                      :checked="checkboxValue(question.id).includes(option)"
                      type="checkbox"
                      @change="handleCheckboxChange(question.id, option, inputChecked($event))"
                    />
                    <span>{{ option }}</span>
                  </label>
                </div>
                <div
                  v-else-if="question.type === 'upload'"
                  class="rounded border border-dashed border-border bg-form-control px-4 py-6 text-sm text-muted"
                >
                  <div class="grid gap-3">
                    <input
                      class="block w-full text-sm text-body file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-white"
                      type="file"
                      @change="handleUploadChange(question, $event)"
                    />
                    <p v-if="uploadFileNames[question.id]" class="text-sm text-body">
                      選択中: {{ uploadFileNames[question.id] }}
                    </p>
                    <p v-else>ファイル選択欄が表示されます。</p>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </SurfaceCard>

        <div class="space-y-3">
          <div
            v-if="submitNoticeVisible"
            class="rounded border border-primary/20 bg-primary-light px-4 py-3 text-sm text-body"
          >
            プレビューのため送信は行われません。
          </div>

          <ActionsFooter align="center">
            <BaseButton variant="primary" size="wide" weight="bold" type="submit"> 送信 </BaseButton>
          </ActionsFooter>
        </div>
      </form>
    </template>

    <div v-else class="mt-6 px-6 max-[1000px]:px-4">
      <ErrorState message="プレビューを取得できませんでした。" />
    </div>
  </PageLayout>
</template>
