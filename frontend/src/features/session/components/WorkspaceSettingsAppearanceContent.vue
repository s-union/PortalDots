<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { useUserSettingsAppearanceTab } from '@/features/session/composables/useUserSettingsAppearanceTab'

const { setTheme, tabs, theme, themeOptions } = useUserSettingsAppearanceTab()
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <SettingsSection title="外観" :title-outside="true">
      <SettingsRow>
        <AlertMessage tone="info" class="flex items-start gap-3">
          <i class="fas fa-info-circle mt-0.5 flex-none text-primary" aria-hidden="true" />
          <span>
            外観設定はお使いのブラウザーに保存されます。サイトデータを削除するとこの設定はリセットされます。
          </span>
        </AlertMessage>
      </SettingsRow>
      <SettingsRow>
        <div class="space-y-4">
          <label v-for="option in themeOptions" :key="option.value" class="relative block cursor-pointer pl-6">
            <input
              class="absolute left-0 mt-[0.35rem]"
              :checked="theme === option.value"
              name="theme"
              type="radio"
              :value="option.value"
              @change="setTheme(option.value)"
            />
            <span class="font-semibold text-body">{{ option.label }}</span
            ><br />
            <span class="text-sm text-muted">{{ option.description }}</span>
          </label>
        </div>
      </SettingsRow>
      <template #footer>
        <div class="text-center text-sm leading-7 text-muted">
          保存ボタンは不要です。選択した時点で即座に反映されます。
        </div>
      </template>
    </SettingsSection>
  </TabbedSettingsPage>
</template>
