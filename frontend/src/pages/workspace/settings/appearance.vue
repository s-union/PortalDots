<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false
  }
})

import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import { useUserSettingsPage } from '@/features/session/settings'
import { type UiTheme } from '@/features/session/theme'

const { tabs, theme, setTheme } = useUserSettingsPage('appearance')

const themeOptions: {
  value: UiTheme
  label: string
  description: string
}[] = [
  {
    value: 'system',
    label: '自動',
    description: 'お使いの端末の設定での外観モード設定に準じます。'
  },
  {
    value: 'light',
    label: 'ライトテーマ',
    description: '明るい外観になります。'
  },
  {
    value: 'dark',
    label: 'ダークテーマ',
    description: '暗い外観になります。'
  }
]
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <SettingsSection title="外観" :title-outside="true">
      <SettingsRow>
        <div class="flex items-start gap-3 rounded bg-primary-light p-4 text-sm text-body">
          <i class="fas fa-info-circle mt-0.5 flex-none text-primary"></i>
          <span> 外観設定はお使いのブラウザーに保存されます。Cookie を削除するとこの設定はリセットされます。 </span>
        </div>
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
