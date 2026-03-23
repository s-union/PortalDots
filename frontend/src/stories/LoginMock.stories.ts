import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LoginMock from './LoginMock.vue'

const meta = {
  title: 'Pages/ログイン画面',
  component: LoginMock,
  parameters: {
    layout: 'fullscreen'
  },
  argTypes: {
    hasError: { control: 'boolean' },
    errorText: { control: 'text' }
  }
} satisfies Meta<typeof LoginMock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    hasError: false
  }
}

export const WithError: Story = {
  args: {
    hasError: true,
    errorText: '学籍番号またはパスワードが正しくありません。'
  }
}
