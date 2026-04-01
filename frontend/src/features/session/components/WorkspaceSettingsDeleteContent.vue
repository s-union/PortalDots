<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { useUserSettingsDeleteTab } from '@/features/session/composables/useUserSettingsDeleteTab'

const { blockedReason, canDeleteAccount, deleteAccount, deleteAccountMutation, errorMessage, tabs } =
  useUserSettingsDeleteTab()

const deleteAccountButtonClass = cn(
  buttonVariants({ variant: 'dangerOutline', size: 'lg', weight: 'bold' }),
  'disabled:border-border disabled:text-muted'
)
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <SettingsSection title="アカウント削除" :title-outside="true">
      <div class="px-6 py-8 text-center">
        <div class="mx-auto max-w-2xl space-y-4 text-sm leading-7 text-body">
          <p>{{ blockedReason }}</p>
          <AlertMessage v-if="errorMessage" tone="danger">
            {{ errorMessage }}
          </AlertMessage>
          <div class="pt-2">
            <button
              :class="deleteAccountButtonClass"
              :disabled="!canDeleteAccount || deleteAccountMutation.isPending.value"
              type="button"
              @click="deleteAccount"
            >
              {{ deleteAccountMutation.isPending.value ? '削除中...' : 'アカウントを削除' }}
            </button>
          </div>
        </div>
      </div>
    </SettingsSection>
  </TabbedSettingsPage>
</template>
