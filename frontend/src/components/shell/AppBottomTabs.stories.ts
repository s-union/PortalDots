import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppBottomTabs from './AppBottomTabs.vue'
import type { MobileTabLink } from '@/app/types/shell'

const meta = {
  title: 'UI/Shell/AppBottomTabs',
  component: AppBottomTabs,
  tags: ['autodocs']
} satisfies Meta<typeof AppBottomTabs>

export default meta
type Story = StoryObj<typeof meta>

const userTabs: MobileTabLink[] = [
  { to: '/', label: 'ホーム', iconClass: 'fas fa-home', active: true },
  { to: '/workspace/pages', label: 'お知らせ', iconClass: 'fas fa-bullhorn', active: false },
  { to: '/workspace/documents', label: '配布資料', iconClass: 'far fa-file-alt', active: false },
  { to: '/workspace/forms', label: '申請', iconClass: 'far fa-edit', active: false }
]

const staffTabs: MobileTabLink[] = [
  { to: '/staff', label: 'ホーム', iconClass: 'fas fa-home', active: true },
  { to: '/staff/circles', label: '企画管理', iconClass: 'fas fa-star', active: false },
  { to: '/staff/forms', label: 'フォーム', iconClass: 'far fa-edit', active: false },
  { to: '/staff/users', label: 'ユーザー', iconClass: 'far fa-address-book', active: false }
]

export const UserMode: Story = {
  args: { tabs: userTabs }
}

export const StaffMode: Story = {
  args: { tabs: staffTabs }
}

export const WithNotifier: Story = {
  args: {
    tabs: [
      { to: '/', label: 'ホーム', iconClass: 'fas fa-home', active: true, showNotifier: true },
      { to: '/workspace/pages', label: 'お知らせ', iconClass: 'fas fa-bell', active: false },
      { to: '/workspace/documents', label: '配布資料', iconClass: 'far fa-file-alt', active: false }
    ]
  }
}
