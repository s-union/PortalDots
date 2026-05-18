import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppDrawer from './AppDrawer.vue'
import type { DrawerNavLink } from '@/app/types/shell'

const meta = {
  title: 'UI/App Shell/AppDrawer',
  component: AppDrawer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    isSmallScreen: { control: 'boolean' },
    isDrawerOpen: { control: 'boolean' },
    drawerTranslateClass: { control: 'text' },
    appName: { control: 'text' },
    appModeLabel: { control: 'text' },
    isStaffRoute: { control: 'boolean' },
    isDemoMode: { control: 'boolean' },
    topDescription: { control: 'text' },
    isAuthenticated: { control: 'boolean' },
    authLabel: { control: 'text' },
    logoutPending: { control: 'boolean' }
  }
} satisfies Meta<typeof AppDrawer>

export default meta
type Story = StoryObj<typeof meta>

const userLinks: DrawerNavLink[] = [
  { to: '/', label: 'ホーム', iconClass: 'fas fa-home', active: true },
  { to: '/workspace/pages', label: 'お知らせ', iconClass: 'fas fa-bullhorn', active: false },
  { to: '/workspace/documents', label: '配布資料', iconClass: 'far fa-file-alt', active: false },
  { to: '/workspace/forms', label: '申請フォーム', iconClass: 'far fa-edit', active: false },
  { to: '/workspace/circles/detail', label: '企画情報', iconClass: 'fas fa-star', active: false }
]

const staffLinks: DrawerNavLink[] = [
  { to: '/staff', label: 'スタッフホーム', iconClass: 'fas fa-home', active: true },
  { to: '/staff/circles', label: '企画管理', iconClass: 'fas fa-star', active: false },
  { to: '/staff/forms', label: 'フォーム管理', iconClass: 'far fa-edit', active: false },
  { to: '/staff/pages', label: 'お知らせ管理', iconClass: 'fas fa-bullhorn', active: false },
  { to: '/staff/users', label: 'ユーザー管理', iconClass: 'far fa-address-book', active: false },
  { to: '/staff/permissions', label: '権限管理', iconClass: 'fas fa-key', active: false, adminOnly: true }
]

export const UserDrawerOpen: Story = {
  args: {
    isSmallScreen: false,
    isDrawerOpen: true,
    drawerTranslateClass: 'translate-x-0',
    appName: 'PortalDots',
    appModeLabel: '一般モード',
    isStaffRoute: false,
    isDemoMode: false,
    topDescription: 'テスト大学学園祭実行委員会',
    modeSwitchTarget: { to: '/staff', label: 'スタッフモードへ' },
    isAuthenticated: true,
    links: userLinks,
    authLabel: '山田 太郎',
    statusBadges: [],
    logoutPending: false
  }
}

export const StaffDrawerOpen: Story = {
  args: {
    isSmallScreen: false,
    isDrawerOpen: true,
    drawerTranslateClass: 'translate-x-0',
    appName: 'PortalDots',
    appModeLabel: 'スタッフモード',
    isStaffRoute: true,
    isDemoMode: false,
    topDescription: 'テスト大学学園祭実行委員会',
    modeSwitchTarget: { to: '/', label: '一般モードへ' },
    isAuthenticated: true,
    links: staffLinks,
    authLabel: 'スタッフ 一郎',
    statusBadges: [{ label: 'スタッフ', variant: 'primary' }],
    logoutPending: false
  }
}

export const DemoMode: Story = {
  args: {
    isSmallScreen: false,
    isDrawerOpen: true,
    drawerTranslateClass: 'translate-x-0',
    appName: 'PortalDots',
    appModeLabel: '一般モード',
    isStaffRoute: false,
    isDemoMode: true,
    topDescription: 'デモサイトです。',
    modeSwitchTarget: null,
    isAuthenticated: false,
    links: userLinks.slice(0, 2),
    authLabel: '',
    statusBadges: [],
    logoutPending: false
  }
}

export const DrawerClosed: Story = {
  args: {
    isSmallScreen: true,
    isDrawerOpen: false,
    drawerTranslateClass: '-translate-x-full',
    appName: 'PortalDots',
    appModeLabel: '一般モード',
    isStaffRoute: false,
    isDemoMode: false,
    topDescription: '',
    modeSwitchTarget: null,
    isAuthenticated: true,
    links: userLinks,
    authLabel: '山田 太郎',
    statusBadges: [],
    logoutPending: false
  }
}
