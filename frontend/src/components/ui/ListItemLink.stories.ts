import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ListItemLink from './ListItemLink.vue'
import StatusBadge from './StatusBadge.vue'

const meta = {
  title: 'UI/ListItemLink',
  component: ListItemLink,
  tags: ['autodocs'],
  argTypes: {
    to: { control: 'text' },
    href: { control: 'text' },
    newTab: { control: 'boolean' },
    legacy: { control: 'boolean' }
  }
} satisfies Meta<typeof ListItemLink>

export default meta
type Story = StoryObj<typeof meta>

export const WithRouterLink: Story = {
  render: () => ({
    components: { ListItemLink, StatusBadge },
    template: `
      <ListItemLink to="/workspace/circles">
        <template #title>テストサークル</template>
        <template #meta>2026年1月15日 更新</template>
        この企画の参加登録の内容を確認できます。
      </ListItemLink>
    `
  })
}

export const WithHref: Story = {
  render: () => ({
    components: { ListItemLink },
    template: `
      <ListItemLink href="https://example.com" new-tab>
        <template #title>外部リンク</template>
        <template #meta>example.com</template>
        外部サイトへのリンクです。
      </ListItemLink>
    `
  })
}

export const WithPrefixSuffix: Story = {
  render: () => ({
    components: { ListItemLink, StatusBadge },
    template: `
      <ListItemLink to="/workspace/pages/page-1">
        <template #prefix>
          <StatusBadge tone="primary" appearance="outlined">限定公開</StatusBadge>
        </template>
        <template #title>テストお知らせ</template>
        <template #suffix>
          <StatusBadge tone="danger" size="sm">NEW</StatusBadge>
        </template>
        <template #meta>2026年1月15日</template>
        これはテスト用のお知らせです。
      </ListItemLink>
    `
  })
}

export const WithRight: Story = {
  render: () => ({
    components: { ListItemLink, StatusBadge },
    template: `
      <ListItemLink to="/workspace/forms/form-1">
        <template #title>テスト申請フォーム</template>
        <template #meta>2026年12月31日まで受付</template>
        <template #right>
          <StatusBadge tone="success">回答済み</StatusBadge>
        </template>
        テスト用の申請フォームです。
      </ListItemLink>
    `
  })
}

export const Legacy: Story = {
  render: () => ({
    components: { ListItemLink },
    template: `
      <ListItemLink to="/workspace/circles" legacy>
        <template #title>テストサークル（レガシー）</template>
        <template #meta>一般参加</template>
      </ListItemLink>
    `
  })
}

export const StaticDiv: Story = {
  render: () => ({
    components: { ListItemLink },
    template: `
      <ListItemLink>
        <template #title>リンクなし（静的）</template>
        <template #meta>メタ情報</template>
        クリック不可のリストアイテムです。
      </ListItemLink>
    `
  })
}
