<script setup lang="ts">
import { useTemplateRef } from 'vue'
import FormischField from '@/components/forms/FormischField.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PanelBody from '@/components/ui/PanelBody.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FileUploadField from '@/components/ui/FileUploadField.vue'
import FormField from '@/components/ui/FormField.vue'
import { useContactForm } from '@/features/contact/composables/useContactForm'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'

const attachment = useTemplateRef('attachment')
const {
  sessionStore,
  categoriesQuery,
  form,
  inputDisabled,
  submitErrorMessage,
  successMessage,
  selectedFile,
  fileError,
  serverFileError,
  submitEvent
} = useContactForm({
  focusAttachment: () => attachment.value?.focus()
})
const maxFileBytes = 5 * 1024 * 1024
const acceptedExtensions = ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'jpeg']
</script>

<template>
  <ListPanel legacy title="お問い合わせ">
    <PanelBody tag="form" novalidate spacious class="grid gap-5" :aria-busy="form.isSubmitting" @submit="submitEvent">
      <p class="text-base leading-7 text-body">
        お問い合わせへの返信は
        <strong>{{ sessionStore.user?.contactEmail || '未設定のメールアドレス' }}</strong>
        に送信されます。メールアドレスは
        <RouterLink class="text-primary underline" to="/workspace/settings">ユーザー設定</RouterLink>
        で変更できます。
      </p>

      <FormischField
        v-slot="{ field, control }"
        :of="form"
        :path="['categoryId']"
        label="お問い合わせ項目"
        id="contact-category"
        required
      >
        <select
          v-bind="control"
          v-model="field.input"
          id="contact-category"
          name="categoryId"
          required
          :disabled="inputDisabled"
        >
          <option value="">選択してください</option>
          <option v-for="category in categoriesQuery.data.value ?? []" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </FormischField>

      <FormischField
        v-if="sessionStore.currentCircle"
        v-slot="{ field, control }"
        :of="form"
        :path="['ccSubleader']"
        label="返信内容の共有先"
        as="fieldset"
      >
        <label
          class="flex items-start gap-3 rounded border border-border bg-surface-light px-4 py-3 text-base text-body"
        >
          <input
            v-bind="control"
            v-model="field.input"
            class="mt-1"
            :disabled="inputDisabled"
            name="ccSubleader"
            type="checkbox"
          />
          <span>
            <span class="block font-medium">副責任者にもメールで共有する（CC）</span>
            <span class="mt-1 block text-base leading-6 text-muted-2">
              チェックを外すと送信者のみに確認メールが送信されます。
            </span>
          </span>
        </label>
      </FormischField>
      <FormischField
        v-slot="{ field, control }"
        :of="form"
        :path="['body']"
        label="お問い合わせ内容"
        id="contact-body"
        required
      >
        <textarea
          v-bind="control"
          v-model="field.input"
          id="contact-body"
          class="min-h-40"
          name="body"
          required
          :disabled="inputDisabled"
        />
      </FormischField>

      <div class="grid gap-2">
        <FormField label="添付ファイル（任意）" as="div" id="contact-file">
          <FileUploadField
            ref="attachment"
            id="contact-file"
            v-model="selectedFile"
            v-model:error="fileError"
            aria-label="添付ファイル（任意）"
            :disabled="inputDisabled"
            :extensions="acceptedExtensions"
            extension-error-message="PDF、Word、Excel、PowerPoint、PNG、JPEG ファイルを選択してください"
            hint="PDF、Word、Excel、PowerPoint、PNG、JPEG（5MB以下）を1ファイル選択できます。"
            :max-size-bytes="maxFileBytes"
            name="file"
            :server-error="serverFileError"
          />
        </FormField>
      </div>

      <AlertMessage v-if="successMessage" tone="success">
        {{ successMessage }}
      </AlertMessage>
      <AlertMessage v-if="submitErrorMessage" tone="danger">
        {{ submitErrorMessage }}
      </AlertMessage>

      <ActionsFooter align="end">
        <button
          :class="cn(buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' }))"
          :disabled="form.isSubmitting || categoriesQuery.isPending.value"
          type="submit"
        >
          {{ form.isSubmitting ? '送信中...' : '送信' }}
        </button>
      </ActionsFooter>
    </PanelBody>
  </ListPanel>
</template>
