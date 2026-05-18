import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppHeader from './AppHeader.vue'

const meta = {
  title: 'UI/App Shell/AppHeader',
  component: AppHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    hasDrawer: { control: 'boolean' },
    pageTitle: { control: 'text' },
    appModeLabel: { control: 'text' },
    isStaffRoute: { control: 'boolean' }
  }
} satisfies Meta<typeof AppHeader>

export default meta
type Story = StoryObj<typeof meta>

export const WithDrawer: Story = {
  args: {
    hasDrawer: true,
    pageTitle: 'ホーム',
    appModeLabel: '一般モード',
    isStaffRoute: false
  }
}

export const WithoutDrawer: Story = {
  args: {
    hasDrawer: false,
    pageTitle: 'PortalDots',
    appModeLabel: '',
    isStaffRoute: false
  }
}

export const StaffMode: Story = {
  args: {
    hasDrawer: true,
    pageTitle: '企画管理',
    appModeLabel: 'スタッフモード',
    isStaffRoute: true
  }
}

export const LongPageTitle: Story = {
  args: {
    hasDrawer: true,
    pageTitle: 'テスト大学学園祭実行委員会のポータルシステムへようこそ',
    appModeLabel: '一般モード',
    isStaffRoute: false
  }
}
