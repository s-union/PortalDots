import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SurfaceHeader from './SurfaceHeader.vue'
import SurfaceCard from './SurfaceCard.vue'

const meta = {
  title: 'UI/Surfaces/SurfaceHeader',
  component: SurfaceHeader,
  tags: ['autodocs'],
  argTypes: {
    borderless: { control: 'boolean' }
  }
} satisfies Meta<typeof SurfaceHeader>

export default meta
type Story = StoryObj<typeof meta>

export const TitleOnly: Story = {
  render: () => ({
    components: { SurfaceHeader, SurfaceCard },
    template: `
      <SurfaceCard>
        <SurfaceHeader>
          <template #title>タイトル</template>
        </SurfaceHeader>
      </SurfaceCard>
    `
  })
}

export const WithDescription: Story = {
  render: () => ({
    components: { SurfaceHeader, SurfaceCard },
    template: `
      <SurfaceCard>
        <SurfaceHeader>
          <template #title>企画一覧</template>
          <template #description>登録されている企画の一覧を表示しています。</template>
        </SurfaceHeader>
      </SurfaceCard>
    `
  })
}

export const WithEyebrow: Story = {
  render: () => ({
    components: { SurfaceHeader, SurfaceCard },
    template: `
      <SurfaceCard>
        <SurfaceHeader>
          <template #eyebrow>スタッフ管理</template>
          <template #title>企画詳細</template>
          <template #description>この企画の詳細情報を確認・編集できます。</template>
        </SurfaceHeader>
      </SurfaceCard>
    `
  })
}

export const WithActions: Story = {
  render: () => ({
    components: { SurfaceHeader, SurfaceCard },
    template: `
      <SurfaceCard>
        <SurfaceHeader>
          <template #title>タグ一覧</template>
          <template #actions>
            <button class="rounded border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white">
              新規作成
            </button>
          </template>
        </SurfaceHeader>
      </SurfaceCard>
    `
  })
}

export const Borderless: Story = {
  render: () => ({
    components: { SurfaceHeader, SurfaceCard },
    template: `
      <SurfaceCard>
        <SurfaceHeader :borderless="true">
          <template #title>ボーダーなし</template>
        </SurfaceHeader>
      </SurfaceCard>
    `
  })
}
