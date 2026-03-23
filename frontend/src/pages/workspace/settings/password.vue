<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { ref } from 'vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { useUserSettingsPage } from '@/features/session/settings'

const { tabs, updatePasswordMutation, extractPasswordValidationMessage, forgotPasswordHref, workspaceBackLink } =
  useUserSettingsPage('password')

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordErrorMessage = ref('')
const passwordSuccessMessage = ref('')

async function handleSavePassword() {
  passwordErrorMessage.value = ''
  passwordSuccessMessage.value = ''

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordErrorMessage.value = '確認用パスワードが一致しません。'
    return
  }

  try {
    await updatePasswordMutation.mutateAsync({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    })
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    passwordSuccessMessage.value = 'パスワードを更新しました。'
  } catch (error) {
    passwordErrorMessage.value = extractPasswordValidationMessage(error)
  }
}
</script>

<template>
  <section class="space-y-6">
    <TabStrip :tabs="tabs" />

    <SettingsSection title="パスワード変更" :title-outside="true">
      <SettingsRow>
        <div class="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-body">認証情報</p>
            <p class="text-xs leading-6 text-muted">
              <a :href="forgotPasswordHref" class="text-primary underline">パスワードをお忘れの場合はこちら</a>
            </p>
          </div>
          <div class="grid gap-4">
            <label class="grid gap-2 text-sm text-body">
              <span>現在のパスワード</span>
              <input v-model="passwordForm.currentPassword" name="currentPassword" type="password" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span>新しいパスワード</span>
              <input v-model="passwordForm.newPassword" name="newPassword" type="password" />
            </label>
            <label class="grid gap-2 text-sm text-body">
              <span>新しいパスワード(確認)</span>
              <input v-model="passwordForm.confirmPassword" name="confirmPassword" type="password" />
            </label>
          </div>
        </div>
      </SettingsRow>
      <template #footer>
        <div class="space-y-4">
          <p
            v-if="passwordSuccessMessage"
            class="rounded border border-success bg-success-light px-4 py-3 text-sm text-success"
          >
            {{ passwordSuccessMessage }}
          </p>
          <p
            v-if="passwordErrorMessage"
            class="rounded border border-danger bg-danger-light px-4 py-3 text-sm text-danger"
          >
            {{ passwordErrorMessage }}
          </p>
          <div class="flex justify-center pt-2">
            <button
              class="min-w-40 rounded bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="updatePasswordMutation.isPending.value"
              type="button"
              @click="handleSavePassword"
            >
              {{ updatePasswordMutation.isPending.value ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </section>
</template>
