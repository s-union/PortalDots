import { useUiThemePreference, type UiTheme } from '@/features/session/theme'
import { useUserSettingsTabs } from './useUserSettingsTabs'

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

export function useUserSettingsAppearanceTab() {
  const { tabs } = useUserSettingsTabs('appearance')
  const { theme, setTheme } = useUiThemePreference()

  return {
    setTheme,
    tabs,
    theme,
    themeOptions
  }
}
