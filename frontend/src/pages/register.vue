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

const startRegistrationMutation = useStartRegistrationMutation()
const publicConfigQuery = usePublicConfigQuery()
const isSubmitting = computed(() => startRegistrationMutation.isPending.value)

const form = reactive({
  univemailLocalPart: ''
})

const errorMessage = ref('')
const successMessage = ref('')
const canSubmit = computed(
  () => !isSubmitting.value && (publicConfigQuery.data.value?.portalUnivemailDomainPart?.trim().length ?? 0) > 0
)

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await startRegistrationMutation.mutateAsync({
      univemailLocalPart: form.univemailLocalPart.trim()
    })
    successMessage.value = result.message
  } catch (error) {
    errorMessage.value = extractFirstErrorMessage(error)
  }
}
</script>

<template>
  <AuthPageLayout width="md" content-class="space-y-6">
    <header class="space-y-2 text-center">
      <h1 class="text-[2rem] font-semibold text-body">ユーザー登録</h1>
      <p class="text-sm text-muted">まず大学メールアドレスを確認し、その後に登録情報を入力します。</p>
    </header>

    <form class="space-y-6 rounded border border-border bg-surface p-6 shadow-lv1" @submit.prevent="handleSubmit">
      <p v-if="successMessage" class="rounded border border-success bg-success-light px-4 py-3 text-sm text-success">
        {{ successMessage }}
      </p>
      <p v-if="errorMessage" class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
        {{ errorMessage }}
      </p>

      <label class="grid gap-2 text-sm text-body">
        <span class="font-semibold">{{
          publicConfigQuery.data.value?.portalUnivemailName ?? '大学メールアドレス'
        }}</span>
        <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <input
            v-model="form.univemailLocalPart"
            autocomplete="username"
            name="univemailLocalPart"
            placeholder="学籍番号"
            required
            type="text"
          />
          <span class="text-sm text-muted">
            @{{ publicConfigQuery.data.value?.portalUnivemailDomainPart ?? 'example.ac.jp' }}
          </span>
        </div>
      </label>
      <div class="space-y-3">
        <button
          class="w-full rounded border border-primary bg-primary px-4 py-3 text-sm text-white transition hover:bg-primary-hover"
          :disabled="!canSubmit"
          type="submit"
        >
          <strong>{{ isSubmitting ? '送信中...' : '認証URLを送信する' }}</strong>
        </button>

        <RouterLink
          class="block w-full rounded border border-border bg-surface px-4 py-3 text-center text-sm text-body transition hover:bg-surface-light hover:no-underline"
          to="/login"
        >
          ログイン画面へ
        </RouterLink>
      </div>
    </form>
  </AuthPageLayout>
</template>
