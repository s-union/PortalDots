<script setup lang="ts">
definePage({
  path: '/staff/verify',
  meta: {
    requiresAuth: true,
    requiresStaffRole: true
  }
})

import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import NarrowPageLayout from '@/components/layouts/NarrowPageLayout.vue'
import ListPanel from '@/components/ui/ListPanel.vue'
import { buttonVariants, formControlVariants } from '@/lib/ui/variants'
import {
  extractStaffVerifyError,
  useConfirmStaffVerificationMutation,
  useRequestStaffVerificationMutation,
  useStaffStatusQuery
} from '@/features/staff/status/api'
import { useSessionStore } from '@/features/session/store'

const router = useRouter()
const sessionStore = useSessionStore()
const staffStatusQuery = useStaffStatusQuery(computed(() => sessionStore.isAuthenticated))
const requestMutation = useRequestStaffVerificationMutation()
const confirmMutation = useConfirmStaffVerificationMutation()
const form = reactive({
  verifyCode: ''
})
const infoMessage = ref('')
const errorMessage = ref('')

async function handleRequestCode() {
  infoMessage.value = ''
  errorMessage.value = ''

  try {
    const result = await requestMutation.mutateAsync()
    infoMessage.value = result.message
  } catch {
    errorMessage.value = '認証コードの送信に失敗しました。'
  }
}

async function handleConfirm() {
  infoMessage.value = ''
  errorMessage.value = ''

  try {
    await confirmMutation.mutateAsync(form.verifyCode)
    await router.push('/staff')
  } catch (error) {
    errorMessage.value = extractStaffVerifyError(error)
  }
}
</script>

<template>
  <NarrowPageLayout class="py-8">
    <ListPanel
      legacy
      title="スタッフ認証"
      description="あなたの連絡先メールアドレス宛に認証メールを送信できます。認証メールに記載されている認証コードを入力してください。"
    >
      <form class="px-6 py-6" @submit.prevent="handleConfirm">
        <label class="grid gap-2 text-sm text-body">
          <span class="font-medium">認証コード</span>
          <input v-model="form.verifyCode" :class="formControlVariants()" name="verifyCode" type="text" />
        </label>

        <p
          v-if="infoMessage"
          class="mt-4 rounded border border-success bg-success-light px-4 py-3 text-sm text-success"
        >
          {{ infoMessage }}
        </p>

        <p v-if="errorMessage" class="mt-4 rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {{ errorMessage }}
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3 pt-6">
          <button
            :class="buttonVariants({ variant: 'secondary', size: 'lg', weight: 'semibold' })"
            :disabled="requestMutation.isPending.value"
            type="button"
            @click="handleRequestCode"
          >
            {{ requestMutation.isPending.value ? '送信中...' : '認証コードを再送する' }}
          </button>
          <button
            :class="buttonVariants({ variant: 'primary', size: 'wide', weight: 'bold' })"
            :disabled="confirmMutation.isPending.value"
            type="submit"
          >
            {{ confirmMutation.isPending.value ? '認証中...' : 'ログイン' }}
          </button>
        </div>
      </form>
    </ListPanel>
  </NarrowPageLayout>
</template>
