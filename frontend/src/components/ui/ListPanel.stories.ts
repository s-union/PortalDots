import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ListPanel from './ListPanel.vue'
import ListItemLink from './ListItemLink.vue'

const meta = {
  title: 'UI/Surfaces/ListPanel',
  component: ListPanel,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    legacy: { control: 'boolean' },
    overflowHidden: { control: 'boolean' }
  }
} satisfies Meta<typeof ListPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { ListPanel, ListItemLink },
    template: `
      <ListPanel title="お知らせ">
        <div class="divide-y divide-border">
          <ListItemLink to="/workspace/pages/1">
            <template #title>テストお知らせ1</template>
            <template #meta>2026年1月15日</template>
          </ListItemLink>
          <ListItemLink to="/workspace/pages/2">
            <template #title>テストお知らせ2</template>
            <template #meta>2026年1月10日</template>
          </ListItemLink>
        </div>
      </ListPanel>
    `
  })
}

export const WithDescription: Story = {
  render: () => ({
    components: { ListPanel, ListItemLink },
    template: `
      <ListPanel title="配布資料" description="公開中の配布資料一覧です。">
        <div class="divide-y divide-border">
          <ListItemLink href="#" new-tab>
            <template #title>テスト資料.pdf</template>
            <template #meta>2026年1月15日</template>
          </ListItemLink>
        </div>
      </ListPanel>
    `
  })
}

export const WithActions: Story = {
  render: () => ({
    components: { ListPanel, ListItemLink },
    template: `
      <ListPanel title="企画一覧">
        <template #actions>
          <button class="rounded border border-primary bg-primary px-4 py-2 text-sm text-white">新規作成</button>
        </template>
        <div class="divide-y divide-border">
          <ListItemLink to="/staff/circles/1">
            <template #title>テストサークル</template>
            <template #meta>一般参加</template>
          </ListItemLink>
        </div>
      </ListPanel>
    `
  })
}

export const Legacy: Story = {
  render: () => ({
    components: { ListPanel, ListItemLink },
    template: `
      <ListPanel title="企画参加登録" description="参加登録の状況を確認できます。" legacy>
        <div class="divide-y divide-border">
          <ListItemLink to="/workspace/circles" legacy>
            <template #title>テストサークル</template>
            <template #meta>一般参加</template>
          </ListItemLink>
        </div>
      </ListPanel>
    `
  })
}

export const Empty: Story = {
  render: () => ({
    components: { ListPanel },
    template: `
      <ListPanel title="お知らせ">
        <div class="px-6 py-6 text-sm text-muted">
          公開中のお知らせはありません。
        </div>
      </ListPanel>
    `
  })
}
