import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AuthRouteNotice from './AuthRouteNotice.vue'

const meta = {
  title: 'UI/Auth/AuthRouteNotice',
  component: AuthRouteNotice,
  tags: ['autodocs'],
  argTypes: {
    eyebrow: { control: 'text' },
    title: { control: 'text' },
    lead: { control: 'text' },
    body: { control: 'text' }
  }
} satisfies Meta<typeof AuthRouteNotice>

export default meta
type Story = StoryObj<typeof meta>

export const LoginRequired: Story = {
  args: {
    title: 'ログインが必要です',
    lead: 'このページを表示するには、ログインが必要です。',
    body: 'アカウントをお持ちでない場合は、新規ユーザー登録を行ってください。',
    actions: [
      { label: 'ログイン', to: '/login', variant: 'primary' },
      { label: 'ユーザー登録', to: '/register' }
    ]
  }
}

export const StaffAccessDenied: Story = {
  args: {
    eyebrow: 'アクセス制限',
    title: 'スタッフ専用ページです',
    lead: 'このページはスタッフのみがアクセスできます。',
    body: 'スタッフとしてのアクセス権限がない場合は、管理者にお問い合わせください。',
    notes: ['このページへのアクセスには管理者の承認が必要です。', '不明な点は問い合わせフォームからご連絡ください。'],
    actions: [
      { label: 'ホームに戻る', to: '/', variant: 'primary' },
      { label: 'お問い合わせ', to: '/support' }
    ]
  }
}

export const EmailVerificationRequired: Story = {
  args: {
    title: 'メール認証が必要です',
    lead: 'このページを表示するには、メール認証を完了する必要があります。',
    body: '登録したメールアドレスに送信された認証メールを確認し、認証を完了してください。',
    actions: [{ label: '認証ページへ', to: '/email/verify', variant: 'primary' }]
  }
}
