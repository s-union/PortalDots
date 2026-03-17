<script setup lang="ts">
definePage({
  meta: {
    requiresAuth: false,
  },
});

import BackLink from "@/components/ui/BackLink.vue";
import SettingsRow from "@/components/ui/SettingsRow.vue";
import SettingsSection from "@/components/ui/SettingsSection.vue";
import TabStrip from "@/components/ui/TabStrip.vue";
import { useUserSettingsPage } from "@/features/session/settings";
import { type UiTheme } from "@/features/session/theme";

const { tabs, theme, setTheme, workspaceBackLink } = useUserSettingsPage("appearance");

const themeOptions: Array<{
  value: UiTheme;
  label: string;
  description: string;
}> = [
  {
    value: "system",
    label: "自動",
    description: "端末のライト / ダーク設定に合わせます。",
  },
  {
    value: "light",
    label: "ライトテーマ",
    description: "常に明るい配色で表示します。",
  },
  {
    value: "dark",
    label: "ダークテーマ",
    description: "常に暗い配色で表示します。",
  },
];
</script>

<template>
  <section class="space-y-6">
    <BackLink :to="workspaceBackLink"> ワークスペースへ戻る </BackLink>

    <TabStrip :tabs="tabs" />

    <SettingsSection title="外観">
      <SettingsRow>
        <div class="grid gap-4 min-[1001px]:grid-cols-[14rem_minmax(0,1fr)] min-[1001px]:gap-6">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-body">テーマ</p>
            <p class="text-xs leading-6 text-muted">
              設定はこのブラウザーの cookie に保存され、次回アクセス時にも引き継がれます。
            </p>
          </div>
          <div class="grid gap-3">
            <label
              v-for="option in themeOptions"
              :key="option.value"
              class="flex items-start gap-3 rounded border px-4 py-3 transition"
              :class="
                theme === option.value
                  ? 'border-primary bg-primary-light'
                  : 'border-border bg-surface'
              "
            >
              <input
                :checked="theme === option.value"
                name="theme"
                type="radio"
                :value="option.value"
                @change="setTheme(option.value)"
              />
              <span class="grid gap-1">
                <span class="text-sm font-semibold text-body">{{ option.label }}</span>
                <span class="text-xs leading-6 text-muted">{{ option.description }}</span>
              </span>
            </label>
          </div>
        </div>
      </SettingsRow>
      <template #footer>
        <div class="text-center text-sm leading-7 text-muted">
          保存ボタンは不要です。選択した時点で即座に反映されます。
        </div>
      </template>
    </SettingsSection>
  </section>
</template>
