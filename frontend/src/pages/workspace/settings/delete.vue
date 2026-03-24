<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { ref } from 'vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { useUserSettingsPage } from '@/features/session/settings'

const { tabs, canDeleteAccount, deleteAccountBlockedReason, deleteAccountMutation, deleteAccount } =
  useUserSettingsPage('delete')

const deleteAccountErrorMessage = ref('')
const deleteAccountButtonClass = cn(
  buttonVariants({ variant: 'dangerOutline', size: 'lg', weight: 'bold' }),
  'disabled:border-border disabled:text-muted'
)

async function handleDeleteAccount() {
  deleteAccountErrorMessage.value = (await deleteAccount()) ?? ''
}
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <SettingsSection title="アカウント削除" :title-outside="true">
      <div class="px-6 py-8 text-center">
        <div class="mx-auto max-w-2xl space-y-4 text-sm leading-7 text-body">
          <p>{{ deleteAccountBlockedReason }}</p>
          <AlertMessage v-if="deleteAccountErrorMessage" tone="danger">
            {{ deleteAccountErrorMessage }}
          </AlertMessage>
          <div class="pt-2">
            <button
              :class="deleteAccountButtonClass"
              :disabled="!canDeleteAccount || deleteAccountMutation.isPending.value"
              type="button"
              @click="handleDeleteAccount"
            >
              {{ deleteAccountMutation.isPending.value ? '削除中...' : 'アカウントを削除' }}
            </button>
          </div>
        </div>
      </div>
    </SettingsSection>
  </TabbedSettingsPage>
</template>
