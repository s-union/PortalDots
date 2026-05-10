import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TabbedSettingsPage from './TabbedSettingsPage.vue'
import type { TabStripItem } from '@/lib/ui/tabStrip'

const meta = {
  title: 'UI/Settings/TabbedSettingsPage',
  component: TabbedSettingsPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' }
} satisfies Meta<typeof TabbedSettingsPage>

export default meta
type Story = StoryObj<typeof meta>

const settingsTabs: TabStripItem[] = [
  { label: '一般', to: '/workspace/settings', active: true },
  { label: '外観', to: '/workspace/settings/appearance', active: false },
  { label: 'パスワード変更', to: '/workspace/settings/password', active: false },
  { label: 'アカウント削除', to: '/workspace/settings/delete', active: false }
]

export const Default: Story = {
  args: { tabs: settingsTabs },
  render: () => ({
    components: { TabbedSettingsPage },
    setup() {
      return { tabs: settingsTabs }
    },
    template: `
      <TabbedSettingsPage :tabs="tabs">
        <div class="rounded border border-border bg-surface p-6 shadow-lv1">
          <h2 class="text-lg font-semibold text-body">一般設定</h2>
          <p class="mt-2 text-sm text-muted">ユーザーの基本情報を変更できます。</p>
        </div>
      </TabbedSettingsPage>
    `
  })
}

const secondTabTabs: TabStripItem[] = [
  { label: '一般', to: '/workspace/settings', active: false },
  { label: '外観', to: '/workspace/settings/appearance', active: true },
  { label: 'パスワード変更', to: '/workspace/settings/password', active: false },
  { label: 'アカウント削除', to: '/workspace/settings/delete', active: false }
]

export const SecondTabActive: Story = {
  args: { tabs: secondTabTabs },
  render: () => ({
    components: { TabbedSettingsPage },
    setup() {
      const tabs = secondTabTabs
      return { tabs }
    },
    template: `
      <TabbedSettingsPage :tabs="tabs">
        <div class="rounded border border-border bg-surface p-6 shadow-lv1">
          <h2 class="text-lg font-semibold text-body">外観設定</h2>
          <p class="mt-2 text-sm text-muted">テーマカラーなどの外観設定を変更できます。</p>
        </div>
      </TabbedSettingsPage>
    `
  })
}
