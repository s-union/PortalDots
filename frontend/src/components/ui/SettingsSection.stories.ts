import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SettingsSection from './SettingsSection.vue'
import SettingsRow from './SettingsRow.vue'

const meta = {
  title: 'UI/SettingsSection',
  component: SettingsSection,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    titleOutside: { control: 'boolean' }
  }
} satisfies Meta<typeof SettingsSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { title: '基本設定' },
  render: (args) => ({
    components: { SettingsSection, SettingsRow },
    setup() {
      return { args }
    },
    template: `
      <SettingsSection v-bind="args">
        <SettingsRow>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">アプリ名</span>
            <input type="text" value="PortalDots" />
          </label>
        </SettingsRow>
        <SettingsRow>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">説明</span>
            <textarea class="min-h-20">テスト大学学園祭実行委員会のポータルシステムです。</textarea>
          </label>
        </SettingsRow>
      </SettingsSection>
    `
  })
}

export const TitleOutside: Story = {
  args: { title: 'プロフィール設定', titleOutside: true },
  render: (args) => ({
    components: { SettingsSection, SettingsRow },
    setup() {
      return { args }
    },
    template: `
      <SettingsSection v-bind="args">
        <SettingsRow>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">氏名</span>
            <input type="text" value="山田 太郎" />
          </label>
        </SettingsRow>
      </SettingsSection>
    `
  })
}

export const WithFooter: Story = {
  args: { title: '保存設定' },
  render: (args) => ({
    components: { SettingsSection, SettingsRow },
    setup() {
      return { args }
    },
    template: `
      <SettingsSection v-bind="args">
        <SettingsRow>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">設定項目</span>
            <input type="text" />
          </label>
        </SettingsRow>
        <template #footer>
          <div class="flex justify-end">
            <button class="rounded border border-primary bg-primary px-6 py-3 text-sm font-bold text-white">保存</button>
          </div>
        </template>
      </SettingsSection>
    `
  })
}
