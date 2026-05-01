import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PageMarkdownContent from './PageMarkdownContent.vue'

const richMarkdown = `# 企画参加登録について

参加登録では、以下の内容を確認してください。

## チェックリスト

- [x] 企画名を入力する
- [ ] 使用場所を確認する
- [ ] 提出前にメンバーへ共有する

## 表

| 項目 | 内容 |
| --- | --- |
| 受付期間 | 2026年1月1日から2026年12月31日 |
| 対象 | 参加団体の責任者 |

> 期限直前は確認に時間がかかる場合があります。

\`PortalDots\` 上で登録内容を更新できます。`

const meta = {
  title: 'UI/お知らせ/Markdown本文',
  component: PageMarkdownContent,
  tags: ['autodocs'],
  argTypes: {
    source: { control: 'text' }
  },
  args: {
    source: richMarkdown
  }
} satisfies Meta<typeof PageMarkdownContent>

export default meta
type Story = StoryObj<typeof meta>

export const RichContent: Story = {}

export const Empty: Story = {
  args: {
    source: ''
  }
}

export const SanitizedHtml: Story = {
  args: {
    source: `<script>alert('xss')</script>

# HTMLを含む本文

<strong>許可されたHTML</strong> は残り、危険なタグは除去されます。`
  }
}
