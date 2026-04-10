<script setup lang="ts">
definePage({
  meta: {
    publicOnly: true,
    noDrawer: true,
    noFooter: true,
    noBottomTabs: true
  }
})

import { computed, reactive, ref } from 'vue'
import AuthPageLayout from '@/components/layouts/AuthPageLayout.vue'
import { extractFirstErrorMessage, useStartRegistrationMutation } from '@/features/auth/api'
import { usePublicConfigQuery } from '@/features/public-home/api'
import { registrationStartFormSchema, useFormValidation } from '@/lib/form-validation'

const registerMutation = useStartRegistrationMutation()
const publicConfigQuery = usePublicConfigQuery()
const isSubmitting = computed(() => registerMutation.isPending.value)
const appName = computed(() => publicConfigQuery.data.value?.appName ?? 'PortalDots')
const studentIdLabel = computed(() => publicConfigQuery.data.value?.portalStudentIdName ?? '学籍番号')
const univemailLabel = computed(() => publicConfigQuery.data.value?.portalUnivemailName ?? '大学メールアドレス')
const univemailDomainPart = computed(() => publicConfigQuery.data.value?.portalUnivemailDomainPart ?? 'example.ac.jp')

const form = reactive({
  univemailLocalPart: ''
})

const successMessage = ref('')
const errorMessage = ref('')
const { getFieldError, validateAll, markTouched } = useFormValidation({
  schema: registrationStartFormSchema,
  form: computed(() => form)
})

async function handleSubmit() {
  successMessage.value = ''
  errorMessage.value = ''

  if (!validateAll()) {
    return
  }

  try {
    const result = await registerMutation.mutateAsync({
      univemailLocalPart: form.univemailLocalPart.trim()
    })
    successMessage.value = result.message
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}
</script>

<template>
  <AuthPageLayout width="md">
    <section class="rounded border border-border bg-surface shadow-lv1">
      <div class="border-b border-border px-6 py-5">
        <h1 class="text-[1.333rem] font-semibold leading-[1.4] text-body">ユーザー登録</h1>
      </div>

      <form class="space-y-5 px-6 py-6 text-sm leading-7 text-body" @submit.prevent="handleSubmit">
        <p>{{ appName }} に登録する大学メールアドレスを入力してください。</p>
        <p>認証URLを送信後、名前や連絡先、パスワードの設定へ進みます。</p>

        <p v-if="successMessage" class="rounded border border-success bg-success-light px-4 py-3 text-success">
          {{ successMessage }}
        </p>
        <p v-if="errorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-danger">
          {{ errorMessage }}
        </p>

        <div class="grid gap-2">
          <label class="grid gap-2">
            <span class="font-semibold">{{ univemailLabel }}</span>
            <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <input
                v-model="form.univemailLocalPart"
                autocomplete="email"
                name="univemailLocalPart"
                required
                type="text"
                :class="{ 'border-danger': getFieldError('univemailLocalPart') }"
                @blur="markTouched('univemailLocalPart')"
                @input="markTouched('univemailLocalPart')"
              />
              <span class="text-sm text-muted">@{{ univemailDomainPart }}</span>
            </div>
          </label>
          <p class="text-xs text-muted">
            {{ studentIdLabel }} は入力したメールアドレスの @ より前の部分として扱われます。
          </p>
          <p v-if="getFieldError('univemailLocalPart')" class="text-xs text-danger">
            {{ getFieldError('univemailLocalPart') }}
          </p>
        </div>

        <div class="pt-2 text-center">
          <button
            class="inline-flex rounded border border-primary bg-primary px-8 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
            :disabled="isSubmitting"
            type="submit"
          >
            {{ isSubmitting ? '送信中...' : '認証URLを送信' }}
          </button>
        </div>
      </form>
    </section>
  </AuthPageLayout>
</template>
