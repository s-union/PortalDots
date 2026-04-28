import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BottomTabLink from './BottomTabLink.vue'

const meta = {
  title: 'UI/BottomTabLink',
  component: BottomTabLink,
  tags: ['autodocs'],
  argTypes: {
    to: { control: 'text' },
    label: { control: 'text' },
    iconClass: { control: 'text' },
    active: { control: 'boolean' },
    showNotifier: { control: 'boolean' }
  }
} satisfies Meta<typeof BottomTabLink>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    to: '/',
    label: 'ホーム',
    iconClass: 'fas fa-home',
    active: false,
    showNotifier: false
  }
}

export const Active: Story = {
  args: {
    to: '/',
    label: 'ホーム',
    iconClass: 'fas fa-home',
    active: true,
    showNotifier: false
  }
}

export const WithNotifier: Story = {
  args: {
    to: '/workspace/circles',
    label: '企画情報',
    iconClass: 'fas fa-circle',
    active: false,
    showNotifier: true
  }
}

export const ActiveWithNotifier: Story = {
  args: {
    to: '/workspace/circles',
    label: '企画情報',
    iconClass: 'fas fa-circle',
    active: true,
    showNotifier: true
  }
}
