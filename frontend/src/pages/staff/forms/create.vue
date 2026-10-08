<script setup lang="ts">
import { staffPageMeta } from '@/lib/pageMeta'
definePage({
  path: '/staff/forms/create',
  meta: staffPageMeta('forms.edit')
})

import { computed } from 'vue'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import StaffTagPicker from '@/components/staff/StaffTagPicker.vue'
import StaffUserPicker from '@/components/staff/StaffUserPicker.vue'
import SurfaceCard from '@/components/ui/SurfaceCard.vue'
import SurfaceCardBand from '@/components/ui/SurfaceCardBand.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import MarkdownEditorField from '@/components/ui/MarkdownEditorField.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useStaffTagsQuery, staffTagColorMap } from '@/features/staff/masters/tags'
import { createDefaultStaffFormPayload } from '@/features/staff/forms/utils'
import { extractStaffFormValidationMessage, useCreateStaffFormMutation } from '@/features/staff/forms/queries'
import { staffFormSchema } from '@/lib/form-validation'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FormischField from '@/components/forms/FormischField.vue'
import DateTimeInput from '@/components/forms/DateTimeInput.vue'

const router = useRouter()
const createFormMutation = useCreateStaffFormMutation()
const tagsQuery = useStaffTagsQuery(true)
const availableTags = computed(() => (tagsQuery.data.value ?? []).map((tag) => tag.name))
const tagColors = computed(() => staffTagColorMap(tagsQuery.data.value ?? []))

const {
  form,
  errorMessage,
  submitEvent: handleCreateForm
} = useSubmitForm({
  schema: staffFormSchema,
  initialInput: createDefaultStaffFormPayload(),
  errorMessage: extractStaffFormValidationMessage,
  submit: async (input) => {
    const created = await createFormMutation.mutateAsync(input)
    await router.replace(`/staff/forms/${encodeURIComponent(created.id)}/editor`)
  }
})
</script>

<template>
  <PageLayout>
    <SurfaceCard>
      <SurfaceCardBand>
        <RouterLink to="/staff/forms" class="text-sm text-primary hover:underline">申請管理</RouterLink>
      </SurfaceCardBand>

      <form class="grid gap-6 px-6 py-6" novalidate :aria-busy="form.isSubmitting" @submit="handleCreateForm">
        <header class="space-y-2">
          <h1 class="text-2xl font-semibold text-body">フォームを新規作成</h1>
        </header>

        <FormischField v-slot="{ field, control }" :of="form" :path="['name']" label="フォーム名" required>
          <input v-bind="control" v-model="field.input" name="name" type="text" />
        </FormischField>

        <FormischField
          v-slot="{ field, control }"
          :of="form"
          :path="['maxAnswers']"
          label="企画毎に回答可能とする回答数"
          helper="通常は「1」にします。1企画がこのフォームに対し複数の回答を作成できるようにするには、2以上の値を入力してください。"
          required
        >
          <input v-bind="control" v-model.number="field.input" min="1" name="maxAnswers" type="number" />
        </FormischField>

        <div class="grid gap-4 md:grid-cols-2">
          <FormischField
            v-slot="{ field, control }"
            :of="form"
            :path="['openAt']"
            label="受付開始日時"
            helper="フォームへの回答受付を開始する日時。"
            required
          >
            <DateTimeInput :control="control" v-model="field.input" />
          </FormischField>

          <FormischField
            v-slot="{ field, control }"
            :of="form"
            :path="['closeAt']"
            label="受付終了日時"
            helper="フォームへの回答受付を終了する日時。"
            required
          >
            <DateTimeInput :control="control" v-model="field.input" />
          </FormischField>
        </div>

        <FormischField
          v-slot="{ field, control }"
          :of="form"
          :path="['isPublic']"
          label="公開設定"
          helper="フォームの内容を公開した場合でも、上記の受付期間内ではない場合、ユーザーはフォームに回答したり、回答内容を編集したりできません。"
        >
          <span class="flex items-center gap-3 text-base text-body">
            <input v-bind="control" v-model="field.input" name="isPublic" type="checkbox" />
            公開する
          </span>
        </FormischField>

        <FormischField
          v-slot="{ field, control }"
          :of="form"
          :path="['answerableTags']"
          label="フォームへ回答可能なユーザー"
          helper="空欄の場合、企画に所属するユーザー全員がフォームに回答できます。タグを指定した場合、指定したタグのうち、1つ以上該当する企画がフォームに回答できます。"
        >
          <StaffTagPicker
            :control="control"
            :model-value="field.input ?? []"
            @update:model-value="field.input = $event"
            :available-tags="availableTags"
            :tag-colors="tagColors"
            name="answerableTags"
          />
        </FormischField>

        <FormischField
          v-slot="{ field, control }"
          :of="form"
          :path="['staffNotificationUserIds']"
          label="スタッフ用控えの送信先"
          helper="回答があったときに「スタッフ用控え」のメールを送信するスタッフを選択します。未指定の場合、フォーム作成者が送信先になります。"
        >
          <StaffUserPicker
            :control="control"
            :model-value="field.input ?? []"
            @update:model-value="field.input = $event"
            name="staffNotificationUserIds"
          />
        </FormischField>

        <details class="rounded border border-border bg-surface-light">
          <summary class="cursor-pointer px-4 py-3 text-base font-semibold text-body">フォームの説明</summary>
          <div class="border-t border-border px-4 py-4">
            <FormischField v-slot="{ field, control }" :of="form" :path="['description']" label="フォームの説明">
              <MarkdownEditorField
                :control="control"
                :model-value="field.input ?? ''"
                @update:model-value="field.input = $event"
                min-height-class="min-h-32"
                name="description"
              />
            </FormischField>
          </div>
        </details>

        <details class="rounded border border-border bg-surface-light">
          <summary class="cursor-pointer px-4 py-3 text-base font-semibold text-body">回答後に表示する内容</summary>
          <div class="border-t border-border px-4 py-4">
            <FormischField
              v-slot="{ field, control }"
              :of="form"
              :path="['confirmationMessage']"
              label="フォームに回答した方に向けて表示するメッセージを設定できます。この内容は、回答したユーザーに自動で送信されるメールにも表示されます。"
            >
              <MarkdownEditorField
                :control="control"
                :model-value="field.input ?? ''"
                @update:model-value="field.input = $event"
                min-height-class="min-h-24"
                name="confirmationMessage"
              />
            </FormischField>
          </div>
        </details>

        <AlertMessage v-if="errorMessage">{{ errorMessage }}</AlertMessage>

        <ActionsFooter align="center">
          <BaseButton variant="primary" size="wide" weight="bold" type="submit" :disabled="form.isSubmitting">
            {{ form.isSubmitting ? '作成中...' : '保存' }}
          </BaseButton>
        </ActionsFooter>
      </form>
    </SurfaceCard>
  </PageLayout>
</template>
