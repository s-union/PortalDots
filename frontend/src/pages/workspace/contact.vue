<script setup lang="ts">
definePage({
  path: '/workspace/contact',
  meta: {
    requiresAuth: true
  }
})

import { computed, reactive, shallowRef, watch } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import PanelBody from '@/components/ui/PanelBody.vue'
import {
  extractContactValidationMessage,
  extractContactFileValidationMessage,
  useContactCategoriesQuery,
  useSubmitContactMutation
} from '@/features/contact/api'
import { useSessionStore } from '@/features/session/store'
import { useUnsavedChangesGuard } from '@/features/forms/composables/useUnsavedChangesGuard'
import { useFormValidation, contactFormSchema } from '@/lib/form-validation'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
import FileUploadField from '@/components/ui/FileUploadField.vue'
import FormError from '@/components/ui/FormError.vue'
import FormField from '@/components/ui/FormField.vue'

const sessionStore = useSessionStore()
const categoriesQuery = useContactCategoriesQuery()
const submitContactMutation = useSubmitContactMutation()
const form = reactive({
  categoryId: '',
  ccSubleader: true,
  body: ''
})
const submitErrorMessage = shallowRef('')
const successMessage = shallowRef('')
const selectedFile = shallowRef<File | null>(null)
const fileError = shallowRef('')
const serverFileError = shallowRef('')
const maxFileBytes = 5 * 1024 * 1024
const acceptedExtensions = ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'jpeg']
const selectedCategoryName = computed(
  () => categoriesQuery.data.value?.find((category) => category.id === form.categoryId)?.name ?? ''
)

const { getFieldError, markTouched, validateAll } = useFormValidation({
  schema: contactFormSchema,
  form: computed(() => form)
})

useUnsavedChangesGuard(
  computed(() => form.categoryId !== '' || form.ccSubleader !== true || form.body !== '' || selectedFile.value !== null)
)

// Clear the stale server-side error whenever the user changes or removes the attachment.
watch(selectedFile, () => {
  serverFileError.value = ''
})

async function handleSubmit() {
  submitErrorMessage.value = ''
  successMessage.value = ''

  if (!validateAll() || fileError.value) {
    return
  }

  try {
    const result = await submitContactMutation.mutateAsync({
      categoryId: form.categoryId,
      subject: selectedCategoryName.value || 'お問い合わせ',
      body: form.body,
      ccSubleader: form.ccSubleader,
      file: selectedFile.value ?? undefined
    })
    successMessage.value = `「${result.categoryName}」に問い合わせを送信しました。`
    form.categoryId = ''
    form.ccSubleader = true
    form.body = ''
    selectedFile.value = null
  } catch (error) {
    serverFileError.value = extractContactFileValidationMessage(error)
    if (!serverFileError.value) {
      submitErrorMessage.value = extractContactValidationMessage(error)
    }
  }
}
</script>

<template>
  <PageLayout spacious>
    <ListPanel legacy title="お問い合わせ">
      <PanelBody tag="form" spacious class="grid gap-5" @submit.prevent="handleSubmit">
        <p class="text-base leading-7 text-body">
          お問い合わせへの返信は
          <strong>{{ sessionStore.user?.contactEmail || '未設定のメールアドレス' }}</strong>
          に送信されます。メールアドレスは
          <RouterLink class="text-primary underline" to="/workspace/settings">ユーザー設定</RouterLink>
          で変更できます。
        </p>

        <div class="grid gap-2">
          <FormField label="お問い合わせ項目">
            <select
              v-model="form.categoryId"
              aria-label="お問い合わせ項目"
              name="categoryId"
              :disabled="submitContactMutation.isPending.value"
              :class="{ 'border-danger': getFieldError('categoryId') }"
              @change="markTouched('categoryId')"
            >
              <option value="">選択してください</option>
              <option v-for="category in categoriesQuery.data.value ?? []" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </FormField>
          <FormError v-if="getFieldError('categoryId')" :message="getFieldError('categoryId')" />
        </div>

        <div v-if="sessionStore.currentCircle" class="grid gap-2">
          <FormField label="返信内容の共有先">
            <label
              class="flex items-start gap-3 rounded border border-border bg-surface-light px-4 py-3 text-base text-body"
            >
              <input
                v-model="form.ccSubleader"
                class="mt-1"
                :disabled="submitContactMutation.isPending.value"
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
          </FormField>
        </div>

        <div class="grid gap-2">
          <FormField label="お問い合わせ内容">
            <textarea
              v-model="form.body"
              class="min-h-40"
              name="body"
              :disabled="submitContactMutation.isPending.value"
              :class="{ 'border-danger': getFieldError('body') }"
              @blur="markTouched('body')"
              @input="markTouched('body')"
            />
          </FormField>
          <FormError v-if="getFieldError('body')" :message="getFieldError('body')" />
        </div>

        <div class="grid gap-2">
          <FormField label="添付ファイル（任意）" as="div">
            <FileUploadField
              id="contact-file"
              v-model="selectedFile"
              v-model:error="fileError"
              aria-label="添付ファイル（任意）"
              :disabled="submitContactMutation.isPending.value"
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
            :disabled="submitContactMutation.isPending.value || categoriesQuery.isPending.value"
            type="submit"
          >
            {{ submitContactMutation.isPending.value ? '送信中...' : '送信' }}
          </button>
        </ActionsFooter>
      </PanelBody>
    </ListPanel>
  </PageLayout>
</template>
