<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { type StaffFormDetail } from '@/features/staff/forms/api'
import { formatDateTime } from '@/lib/format/datetime'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import UploadFileRow from './UploadFileRow.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
const PageMarkdownContent = defineAsyncComponent(() => import('@/features/pages/components/PageMarkdownContent.vue'))

const { formId, form, isParticipationForm } = defineProps<{
  formId: string
  form: StaffFormDetail
  isParticipationForm?: boolean
}>()

function answerDetails(questionId: string) {
  return form.answer?.details[questionId] ?? []
}

function answerUploads(questionId: string) {
  return (form.answer?.uploads ?? []).filter((upload) => upload.questionId === questionId)
}

const totalUploads = computed(() => form.answer?.uploads.length ?? 0)
</script>

<template>
  <SurfaceCard id="answer-panel" tag="section" class="scroll-mt-24">
    <SurfaceCardBand class="py-4">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-lg font-medium text-body">現在企画の回答</h3>
        <div class="flex flex-wrap items-center gap-3">
          <p class="text-xs text-muted-2">
            {{ form.answer?.updatedAt ? `最終更新 ${formatDateTime(form.answer.updatedAt)}` : '未回答' }}
          </p>
          <p v-if="isParticipationForm" class="text-xs text-muted-2">
            参加登録フォームの回答管理はここでは行えません。
          </p>
          <RouterLink
            v-else
            :to="`/staff/forms/${formId}/answers`"
            class="rounded border border-border px-3 py-2 text-xs text-body transition hover:bg-surface-light"
          >
            回答管理へ
          </RouterLink>
        </div>
      </div>
    </SurfaceCardBand>

    <div v-if="form.answer" class="m-6 overflow-hidden rounded border border-border bg-surface">
      <template v-for="question in form.questions" :key="question.id">
        <div v-if="question.type === 'heading'" class="border-b border-border px-4 py-4 last:border-b-0">
          <h4 class="text-base font-semibold text-body">{{ question.name }}</h4>
          <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
            {{ question.description }}
          </p>
        </div>
        <div v-else class="border-b border-border px-4 py-4 last:border-b-0">
          <p class="text-sm font-semibold text-body">{{ question.name }}</p>
          <p v-if="question.description" class="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
            {{ question.description }}
          </p>

          <div v-if="question.type === 'upload'" class="mt-3 grid gap-3">
            <p v-if="answerUploads(question.id).length === 0" class="text-sm text-muted-2">
              添付ファイルはありません。
            </p>
            <UploadFileRow
              v-for="upload in answerUploads(question.id)"
              :key="upload.id"
              :form-id="formId"
              :upload="upload"
              variant="highlight"
            />
          </div>

          <p v-else-if="question.type === 'checkbox'" class="mt-3 text-sm leading-7 text-body">
            {{ answerDetails(question.id).join(', ') || '未入力' }}
          </p>

          <pre v-else-if="question.type === 'textarea'" class="mt-3 whitespace-pre-wrap text-sm leading-7 text-body">{{
            answerDetails(question.id)[0] ?? ''
          }}</pre>

          <PageMarkdownContent
            v-else-if="question.type === 'markdown'"
            class="mt-3 rounded border border-border bg-surface p-3"
            :source="answerDetails(question.id)[0] ?? ''"
          />

          <p v-else class="mt-3 text-sm leading-7 text-body">
            {{ answerDetails(question.id)[0] ?? '未入力' }}
          </p>
        </div>
      </template>
    </div>
    <p v-else class="px-6 py-5 text-sm text-muted-2">まだ回答はありません。</p>

    <div class="border-t border-border px-6 py-5">
      <div class="flex items-center justify-between gap-4">
        <h4 class="text-sm font-medium text-body">添付ファイル</h4>
        <span class="text-xs text-muted-2"> {{ totalUploads }} 件 </span>
      </div>

      <p v-if="totalUploads === 0" class="mt-3 text-sm text-muted-2">添付ファイルはまだありません。</p>

      <ul v-else class="mt-3 grid gap-3">
        <li v-for="upload in form.answer?.uploads" :key="upload.id">
          <UploadFileRow :form-id="formId" :upload="upload" />
        </li>
      </ul>
    </div>
  </SurfaceCard>
</template>
