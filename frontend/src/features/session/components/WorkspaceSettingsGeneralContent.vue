<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { useUserSettingsGeneralTab } from '@/features/session/composables/useUserSettingsGeneralTab'

const { displayName, errorMessage, saveProfile, sessionStore, successMessage, tabs, updateProfileMutation } =
  useUserSettingsGeneralTab()
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <SettingsSection title="一般設定" :title-outside="true">
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">表示名</p>
          <div class="grid gap-2">
            <input v-model="displayName" name="displayName" type="text" />
            <p class="text-xs text-muted">他のユーザーやスタッフに表示される名前です。</p>
          </div>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">ユーザー ID</p>
          <p class="text-sm text-body">{{ sessionStore.user?.id ?? '-' }}</p>
        </div>
      </SettingsRow>
      <SettingsRow>
        <div class="grid gap-3 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <p class="text-sm font-semibold text-body">現在の企画</p>
          <p class="text-sm text-body">{{ sessionStore.currentCircle?.name ?? '企画未選択' }}</p>
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
              :disabled="updateProfileMutation.isPending.value"
              type="button"
              @click="saveProfile"
            >
              {{ updateProfileMutation.isPending.value ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </TabbedSettingsPage>
</template>
