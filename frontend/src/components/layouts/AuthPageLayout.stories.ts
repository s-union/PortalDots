import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AuthPageLayout from './AuthPageLayout.vue'

const meta = {
  title: 'UI/Layout/AuthPageLayout',
  component: AuthPageLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    width: {
      control: 'select',
      options: ['sm', 'md']
    }
  }
} satisfies Meta<typeof AuthPageLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Small: Story = {
  args: { width: 'sm' },
  render: (args) => ({
    components: { AuthPageLayout },
    setup() {
      return { args }
    },
    template: `
      <AuthPageLayout v-bind="args">
        <h1 class="mb-6 text-center text-2xl font-semibold text-body">ログイン</h1>
        <div class="space-y-4">
          <input type="text" placeholder="学籍番号またはメールアドレス" class="w-full rounded border border-border px-4 py-3" />
          <input type="password" placeholder="パスワード" class="w-full rounded border border-border px-4 py-3" />
          <button class="w-full rounded border border-primary bg-primary px-4 py-3 text-sm font-bold text-white">
            ログイン
          </button>
        </div>
      </AuthPageLayout>
    `
  })
}

export const Medium: Story = {
  args: { width: 'md' },
  render: (args) => ({
    components: { AuthPageLayout },
    setup() {
      return { args }
    },
    template: `
      <AuthPageLayout v-bind="args">
        <h1 class="mb-6 text-center text-2xl font-semibold text-body">ユーザー登録</h1>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <input type="text" placeholder="姓" class="rounded border border-border px-4 py-3" />
            <input type="text" placeholder="名" class="rounded border border-border px-4 py-3" />
          </div>
          <input type="email" placeholder="メールアドレス" class="w-full rounded border border-border px-4 py-3" />
          <input type="password" placeholder="パスワード" class="w-full rounded border border-border px-4 py-3" />
          <button class="w-full rounded border border-primary bg-primary px-4 py-3 text-sm font-bold text-white">
            登録
          </button>
        </div>
      </AuthPageLayout>
    `
  })
}
