<script setup lang="ts">
definePage({
  path: '/workspace/contact',
  meta: {
    requiresAuth: true
  }
})

import { computed, reactive, shallowRef, useTemplateRef } from 'vue'
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
import { useFormValidation, contactFormSchema } from '@/lib/form-validation'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import ActionsFooter from '@/components/ui/ActionsFooter.vue'
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
const fileTouched = shallowRef(false)
const serverFileError = shallowRef('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const maxFileBytes = 5 * 1024 * 1024
const acceptedExtensions = ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'jpeg']
const selectedCategoryName = computed(
  () => categoriesQuery.data.value?.find((category) => category.id === form.categoryId)?.name ?? ''
)
const clientFileError = computed(() => {
  if (!fileTouched.value || !selectedFile.value) return ''
  if (selectedFile.value.size === 0) return '空のファイルはアップロードできません'
  if (selectedFile.value.size > maxFileBytes) return 'ファイルサイズは 5MB 以下にしてください'
  const extension = selectedFile.value.name.split('.').pop()?.toLowerCase() ?? ''
  if (!acceptedExtensions.includes(extension)) {
    return 'PDF、Word、Excel、PowerPoint、PNG、JPEG ファイルを選択してください'
  }
  return ''
})
const fileError = computed(() => clientFileError.value || serverFileError.value)
const fileDescriptionIDs = computed(() =>
  fileError.value ? 'contact-file-hint contact-file-error' : 'contact-file-hint'
)

const { getFieldError, markTouched, validateAll } = useFormValidation({
  schema: contactFormSchema,
  form: computed(() => form)
})

async function handleSubmit() {
  submitErrorMessage.value = ''
  successMessage.value = ''

  fileTouched.value = true
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
    removeSelectedFile()
  } catch (error) {
    serverFileError.value = extractContactFileValidationMessage(error)
    if (!serverFileError.value) {
      submitErrorMessage.value = extractContactValidationMessage(error)
    }
  }
}

function handleFileChange(event: Event) {
  if (!(event.currentTarget instanceof HTMLInputElement)) return
  selectedFile.value = event.currentTarget.files?.[0] ?? null
  fileTouched.value = true
  serverFileError.value = ''
}

function removeSelectedFile() {
  selectedFile.value = null
  fileTouched.value = false
  serverFileError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function formatFileSize(size: number) {
  return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(size / 1024)} KB`
}
</script>

<template>
  <PageLayout spacious>
    <ListPanel legacy title="お問い合わせ">
      <PanelBody tag="form" spacious class="grid gap-5" @submit.prevent="handleSubmit">
        <p class="text-sm leading-7 text-body">
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
              class="flex items-start gap-3 rounded border border-border bg-surface-light px-4 py-3 text-sm text-body"
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
                <span class="mt-1 block text-xs leading-6 text-muted-2">
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
          <FormField label="添付ファイル（任意）">
            <p id="contact-file-hint" class="mb-2 text-xs leading-6 text-muted-2">
              PDF、Word、Excel、PowerPoint、PNG、JPEG（5MB以下）を1ファイル選択できます。
            </p>
            <input
              ref="fileInput"
              accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              :aria-describedby="fileDescriptionIDs"
              :aria-invalid="fileError ? 'true' : undefined"
              :class="{ 'border-danger': fileError }"
              :disabled="submitContactMutation.isPending.value"
              name="file"
              type="file"
              @change="handleFileChange"
            />
          </FormField>
          <div
            v-if="selectedFile"
            class="flex items-center justify-between gap-3 rounded border border-border bg-surface-light px-4 py-3 text-sm"
          >
            <span class="min-w-0 truncate">{{ selectedFile.name }}（{{ formatFileSize(selectedFile.size) }}）</span>
            <button
              class="shrink-0 text-primary underline"
              :disabled="submitContactMutation.isPending.value"
              type="button"
              @click="removeSelectedFile"
            >
              選択を解除
            </button>
          </div>
          <FormError v-if="fileError" id="contact-file-error" :message="fileError" />
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
