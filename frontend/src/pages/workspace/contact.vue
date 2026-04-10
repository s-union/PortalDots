<script setup lang="ts">
definePage({
  path: '/workspace/contact',
  meta: {
    requiresAuth: true,
    requiresCircle: true
  }
})

import { computed, reactive, ref } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import PageLayout from '@/components/layouts/PageLayout.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import {
  extractContactValidationMessage,
  useContactCategoriesQuery,
  useSubmitContactMutation
} from '@/features/contact/api'
import { useSessionStore } from '@/features/session/store'
import { useFormValidation, contactFormSchema } from '@/lib/form-validation'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'

const sessionStore = useSessionStore()
const categoriesQuery = useContactCategoriesQuery()
const submitContactMutation = useSubmitContactMutation()
const form = reactive({
  categoryId: '',
  body: ''
})
const submitErrorMessage = ref('')
const successMessage = ref('')
const selectedCategoryName = computed(
  () => categoriesQuery.data.value?.find((category) => category.id === form.categoryId)?.name ?? ''
)
const selectedCircleLabel = computed(() => sessionStore.currentCircle?.name ?? '')

const { getFieldError, markTouched, validateAll } = useFormValidation({
  schema: contactFormSchema,
  form: computed(() => form)
})

async function handleSubmit() {
  submitErrorMessage.value = ''
  successMessage.value = ''

  if (!validateAll()) {
    return
  }

  try {
    const result = await submitContactMutation.mutateAsync({
      categoryId: form.categoryId,
      subject: selectedCategoryName.value || 'お問い合わせ',
      body: form.body
    })
    successMessage.value = `「${result.categoryName}」に問い合わせを送信しました。`
    form.categoryId = ''
    form.body = ''
  } catch (error) {
    submitErrorMessage.value = extractContactValidationMessage(error)
  }
}
</script>

<template>
  <PageLayout>
    <ListPanel legacy title="お問い合わせ">
      <form class="grid gap-5 px-6 py-6" @submit.prevent="handleSubmit">
        <p class="text-sm leading-7 text-body">
          お問い合わせへの返信は
          <strong>{{ sessionStore.user?.contactEmail || '未設定のメールアドレス' }}</strong>
          に送信されます。メールアドレスは
          <RouterLink class="text-primary underline" to="/workspace/settings">ユーザー設定</RouterLink>
          で変更できます。
        </p>

        <div class="grid gap-2">
          <label class="grid gap-2 text-sm text-body">
            <span>企画名</span>
            <input :value="selectedCircleLabel" readonly type="text" />
          </label>
        </div>

        <div class="grid gap-2">
          <label class="grid gap-2 text-sm text-body">
            <span>お問い合わせ項目</span>
            <select
              v-model="form.categoryId"
              aria-label="お問い合わせ項目"
              name="categoryId"
              :class="{ 'border-danger': getFieldError('categoryId') }"
              @change="markTouched('categoryId')"
            >
              <option value="">選択してください</option>
              <option v-for="category in categoriesQuery.data.value ?? []" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <p v-if="getFieldError('categoryId')" class="text-xs text-danger">{{ getFieldError('categoryId') }}</p>
        </div>

        <div class="grid gap-2">
          <label class="grid gap-2 text-sm text-body">
            <span>お問い合わせ内容</span>
            <textarea
              v-model="form.body"
              class="min-h-40"
              name="body"
              :class="{ 'border-danger': getFieldError('body') }"
              @blur="markTouched('body')"
              @input="markTouched('body')"
            />
          </label>
          <p v-if="getFieldError('body')" class="text-xs text-danger">{{ getFieldError('body') }}</p>
        </div>

        <AlertMessage v-if="successMessage" tone="success">
          {{ successMessage }}
        </AlertMessage>
        <AlertMessage v-if="submitErrorMessage" tone="danger">
          {{ submitErrorMessage }}
        </AlertMessage>

        <div class="flex justify-end">
          <button
            :class="cn(buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' }))"
            :disabled="submitContactMutation.isPending.value || categoriesQuery.isPending.value"
            type="submit"
          >
            {{ submitContactMutation.isPending.value ? '送信中...' : '送信' }}
          </button>
        </div>
      </form>
    </ListPanel>
  </PageLayout>
</template>
