<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/create',
  meta: staffPageMeta('forms.edit')
})

import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useStaffTagsQuery } from '@/features/staff/masters/tags'
import { formatDateTimeLocalValue, parseDateTimeLocalValue } from '@/lib/format/datetime'
import {
  createDefaultStaffFormPayload,
  extractStaffFormValidationMessage,
  useCreateStaffFormMutation
} from '@/features/staff/forms/api'
import { useFormValidation, staffFormSchema } from '@/lib/form-validation'
import FormError from '@/components/ui/FormError.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormField from '@/components/ui/FormField.vue'

const router = useRouter()
const createFormMutation = useCreateStaffFormMutation()
const form = ref(createDefaultStaffFormPayload())
const errorMessage = ref('')
const tagsQuery = useStaffTagsQuery(true)
const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))

const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: staffFormSchema,
  form
})

const openAtInput = computed({
  get: () => formatDateTimeLocalValue(form.value.openAt),
  set: (value: string) => {
    form.value.openAt = parseDateTimeLocalValue(value, form.value.openAt)
    markTouched('openAt')
  }
})

const closeAtInput = computed({
  get: () => formatDateTimeLocalValue(form.value.closeAt),
  set: (value: string) => {
    form.value.closeAt = parseDateTimeLocalValue(value, form.value.closeAt)
    markTouched('closeAt')
  }
})

async function handleCreateForm() {
  errorMessage.value = ''

  if (!validateAll()) {
    return
  }

  try {
    const created = await createFormMutation.mutateAsync({
      ...form.value,
      maxAnswers: Math.max(1, Number(form.value.maxAnswers) || 1)
    })
    await router.push(`/staff/forms/${encodeURIComponent(created.id)}/editor`)
  } catch (error) {
    errorMessage.value = extractStaffFormValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <SurfaceCard>
      <SurfaceCardBand>
        <RouterLink to="/staff/forms" class="text-sm text-primary hover:underline">申請管理</RouterLink>
      </SurfaceCardBand>

      <form class="grid gap-6 px-6 py-6" @submit.prevent="handleCreateForm">
        <header class="space-y-2">
          <h1 class="text-2xl font-semibold text-body">フォームを新規作成</h1>
        </header>

        <FormField label="フォーム名" :error="getFieldError('name')" required>
          <input
            v-model="form.name"
            name="name"
            type="text"
            :class="{ 'border-danger': getFieldError('name') }"
            @blur="markTouched('name')"
            @input="markTouched('name')"
          />
        </FormField>

        <FormField
          label="企画毎に回答可能とする回答数"
          helper="通常は「1」にします。1企画がこのフォームに対し複数の回答を作成できるようにするには、2以上の値を入力してください。"
          :error="getFieldError('maxAnswers')"
          required
        >
          <input
            v-model.number="form.maxAnswers"
            min="1"
            name="maxAnswers"
            type="number"
            :class="{ 'border-danger': getFieldError('maxAnswers') }"
            @blur="markTouched('maxAnswers')"
            @input="markTouched('maxAnswers')"
          />
        </FormField>

        <div class="grid gap-4 md:grid-cols-2">
          <FormField
            label="受付開始日時"
            helper="フォームへの回答受付を開始する日時。"
            :error="getFieldError('openAt')"
            required
          >
            <input
              v-model="openAtInput"
              name="openAt"
              type="datetime-local"
              :class="{ 'border-danger': getFieldError('openAt') }"
              @blur="markTouched('openAt')"
            />
          </FormField>

          <FormField
            label="受付終了日時"
            helper="フォームへの回答受付を終了する日時。"
            :error="getFieldError('closeAt')"
            required
          >
            <input
              v-model="closeAtInput"
              name="closeAt"
              type="datetime-local"
              :class="{ 'border-danger': getFieldError('closeAt') }"
              @blur="markTouched('closeAt')"
            />
          </FormField>
        </div>

        <FormField
          label="公開設定"
          helper="フォームの内容を公開した場合でも、上記の受付期間内ではない場合、ユーザーはフォームに回答したり、回答内容を編集したりできません。"
        >
          <span class="flex items-center gap-3 text-sm text-body">
            <input v-model="form.isPublic" name="isPublic" type="checkbox" />
            公開する
          </span>
        </FormField>

        <FormField
          label="フォームへ回答可能なユーザー"
          helper="空欄の場合、企画に所属するユーザー全員がフォームに回答できます。タグを指定した場合、指定したタグのうち、1つ以上該当する企画がフォームに回答できます。"
        >
          <StaffTagPicker v-model="form.answerableTags" :available-tags="availableTags" name="answerableTags" />
        </FormField>

        <details class="rounded border border-border bg-surface-light">
          <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-body">フォームの説明</summary>
          <div class="border-t border-border px-4 py-4">
            <FormField label="フォームの説明">
              <MarkdownEditorField v-model="form.description" min-height-class="min-h-32" name="description" />
            </FormField>
          </div>
        </details>

        <details class="rounded border border-border bg-surface-light">
          <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-body">回答後に表示する内容</summary>
          <div class="border-t border-border px-4 py-4">
            <FormField
              label="フォームに回答した方に向けて表示するメッセージを設定できます。この内容は、回答したユーザーに自動で送信されるメールにも表示されます。"
            >
              <MarkdownEditorField
                v-model="form.confirmationMessage"
                min-height-class="min-h-24"
                name="confirmationMessage"
              />
            </FormField>
          </div>
        </details>

        <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

        <ActionsFooter align="center">
          <BaseButton
            variant="primary"
            size="wide"
            weight="bold"
            type="submit"
            :disabled="createFormMutation.isPending.value"
          >
            {{ createFormMutation.isPending.value ? '作成中...' : '保存' }}
          </BaseButton>
        </ActionsFooter>
      </form>
    </SurfaceCard>
  </PageLayout>
</template>
