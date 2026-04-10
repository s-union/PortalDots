<script setup lang="ts">
import TabbedSettingsPage from '@/components/layouts/TabbedSettingsPage.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { cn } from '@/lib/ui/cn'
import { buttonVariants } from '@/lib/ui/variants'
import { useUserSettingsAppearanceTab } from '@/features/session/composables/useUserSettingsAppearanceTab'

const { chooseTheme, hasUnsavedChanges, saveTheme, selectedTheme, tabs, themeOptions } = useUserSettingsAppearanceTab()
</script>

<template>
  <TabbedSettingsPage :tabs="tabs">
    <SettingsSection title="外観" :title-outside="true">
      <SettingsRow>
        <div class="space-y-4">
          <label v-for="option in themeOptions" :key="option.value" class="relative block cursor-pointer pl-6">
            <input
              class="absolute left-0 mt-[0.35rem]"
              :checked="selectedTheme === option.value"
              name="theme"
              type="radio"
              :value="option.value"
              @change="chooseTheme(option.value)"
            />
            <span class="font-semibold text-body">{{ option.label }}</span
            ><br />
            <span class="text-sm text-muted">{{ option.description }}</span>
          </label>
        </div>
      </SettingsRow>
      <template #footer>
        <div class="flex justify-center pt-2">
          <button
            :class="cn(buttonVariants({ variant: 'primary', size: 'lg', weight: 'bold' }), 'min-w-40')"
            :disabled="!hasUnsavedChanges"
            type="button"
            @click="saveTheme"
          >
            保存
          </button>
        </div>
      </template>
    </SettingsSection>
  </TabbedSettingsPage>
</template>
