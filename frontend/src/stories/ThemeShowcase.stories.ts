import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ThemeShowcase from './ThemeShowcase.vue'

const meta = {
  title: 'Theme/ライトテーマ一覧',
  component: ThemeShowcase,
  parameters: {
    layout: 'fullscreen'
  },
  argTypes: {
    primaryLabel: { control: 'text' },
    showDanger: { control: 'boolean' },
    showSuccess: { control: 'boolean' }
  }
} satisfies Meta<typeof ThemeShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    primaryLabel: 'プライマリ',
    showDanger: true,
    showSuccess: true
  }
}

export const ButtonsOnly: Story = {
  args: {
    primaryLabel: 'ログイン',
    showDanger: false,
    showSuccess: false
  }
}
