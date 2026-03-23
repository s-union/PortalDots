<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: true
  }
})

import { ref } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import PageContentContainer from '@/components/ui/PageContentContainer.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import TabStrip from '@/components/ui/TabStrip.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { useUserSettingsPage } from '@/features/session/settings'

const { tabs, sessionStore, updateProfileMutation, workspaceBackLink, extractProfileValidationMessage } =
  useUserSettingsPage('general')

const displayName = ref(sessionStore.user?.displayName ?? '')
const errorMessage = ref('')
const successMessage = ref('')

async function handleSaveProfile() {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await updateProfileMutation.mutateAsync({ displayName: displayName.value })
    displayName.value = sessionStore.user?.displayName ?? displayName.value
    successMessage.value = '表示名を更新しました。'
  } catch (error) {
    errorMessage.value = extractProfileValidationMessage(error)
  }
}
</script>

<template>
  <PageContentContainer>
    <TabStrip :tabs="tabs" />

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
              @click="handleSaveProfile"
            >
              {{ updateProfileMutation.isPending.value ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </template>
    </SettingsSection>
  </PageContentContainer>
</template>
