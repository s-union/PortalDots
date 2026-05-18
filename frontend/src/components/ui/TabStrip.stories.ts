import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TabStrip from './TabStrip.vue'
import type { TabStripItem } from '@/lib/ui/tabStrip'

const meta = {
  title: 'UI/Navigation/TabStrip',
  component: TabStrip,
  tags: ['autodocs']
} satisfies Meta<typeof TabStrip>

export default meta
type Story = StoryObj<typeof meta>

const basicTabs: TabStripItem[] = [
  { label: '一般モード', to: '/', active: true },
  { label: 'スタッフモード', to: '/staff', active: false }
]

const settingsTabs: TabStripItem[] = [
  { label: '一般', to: '/workspace/settings', active: true },
  { label: '外観', to: '/workspace/settings/appearance', active: false },
  { label: 'パスワード変更', to: '/workspace/settings/password', active: false },
  { label: 'アカウント削除', to: '/workspace/settings/delete', active: false }
]

const tabsWithBadges: TabStripItem[] = [
  { label: '回答', to: '/staff/forms/form-1/answers', active: true },
  { label: 'エディター', to: '/staff/forms/form-1/editor', active: false },
  { label: '設定', to: '/staff/forms/form-1/edit', badge: '受付期間内', badgeTone: 'primary', active: false }
]

export const ModeTabs: Story = {
  args: { tabs: basicTabs }
}

export const SettingsTabs: Story = {
  args: { tabs: settingsTabs }
}

export const WithBadges: Story = {
  args: { tabs: tabsWithBadges }
}

export const SecondTabActive: Story = {
  args: {
    tabs: [
      { label: '一般モード', to: '/', active: false },
      { label: 'スタッフモード', to: '/staff', active: true }
    ]
  }
}

export const DangerBadge: Story = {
  args: {
    tabs: [
      { label: '企画一覧', to: '/staff/circles', active: true },
      { label: '参加種別を編集', to: '/staff/circles/participation_types/type-1/edit', active: false },
      {
        label: '参加登録フォームの設定',
        to: '/staff/circles/participation_types/type-1/form/edit',
        badge: '非公開',
        badgeTone: 'muted',
        active: false
      }
    ]
  }
}
