<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { SchemaFormFields, type FieldOverrides } from '@/features/forms/schema-form'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PanelBody from '@/components/ui/PanelBody.vue'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FileUploadField from '@/components/ui/FileUploadField.vue'
import FormField from '@/components/ui/FormField.vue'
import { useContactForm } from '@/features/contact/composables/useContactForm'
import { contactFormSchema } from '@/lib/form-validation'
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

// categoryId's options come from a query; ccSubleader is hidden entirely when the user has no
// current circle (there is no co-responsible leader to CC).
const overrides = computed<FieldOverrides<typeof contactFormSchema.entries>>(() => ({
  categoryId: {
    options: (categoriesQuery.data.value ?? []).map((category) => ({ value: category.id, label: category.name }))
  },
  ccSubleader: { hidden: !sessionStore.currentCircle }
}))
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

      <SchemaFormFields :of="form" :schema="contactFormSchema" :disabled="inputDisabled" :overrides="overrides" />

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
