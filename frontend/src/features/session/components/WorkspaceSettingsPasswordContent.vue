<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { useUserSettingsPasswordTab } from '@/features/session/composables/useUserSettingsPasswordTab'

const { errorMessage, forgotPasswordHref, passwordForm, savePassword, successMessage, tabs, updatePasswordMutation } =
  useUserSettingsPasswordTab()
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
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
          <AlertMessage v-if="successMessage" tone="success">
            {{ successMessage }}
          </AlertMessage>
          <AlertMessage v-if="errorMessage" tone="danger">
            {{ errorMessage }}
          </AlertMessage>
          <div class="flex justify-center pt-2">
            <button
              :class="cn(buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' }), 'min-w-40')"
              :disabled="updatePasswordMutation.isPending.value"
              type="button"
              @click="savePassword"
            >
              {{ updatePasswordMutation.isPending.value ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </TabbedSettingsPage>
</template>
