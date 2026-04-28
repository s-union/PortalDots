import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent } from 'vue'
import AsyncBoundary from './AsyncBoundary.vue'

const meta = {
  title: 'UI/Async/AsyncBoundary',
  component: AsyncBoundary,
  tags: ['autodocs'],
  argTypes: {
    suspenseKey: { control: 'text' }
  }
} satisfies Meta<typeof AsyncBoundary>

export default meta
type Story = StoryObj<typeof meta>

// 正常なコンテンツ
const NormalContent = defineComponent({
  template: `<div class="rounded border border-border bg-surface p-6">コンテンツが正常に表示されました</div>`
})

// エラーを投げるコンポーネント
const ErrorContent = defineComponent({
  setup() {
    throw new Error('データの読み込みに失敗しました。')
  },
  template: `<div>表示されない</div>`
})

export const Normal: Story = {
  render: () => ({
    components: { AsyncBoundary, NormalContent },
    template: `
      <AsyncBoundary>
        <NormalContent />
        <template #fallback>
          <div class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">読み込み中...</div>
        </template>
      </AsyncBoundary>
    `
  })
}

export const WithError: Story = {
  render: () => ({
    components: { AsyncBoundary, ErrorContent },
    template: `
      <AsyncBoundary>
        <ErrorContent />
        <template #fallback>
          <div class="rounded border border-border bg-surface p-6 text-muted shadow-lv1">読み込み中...</div>
        </template>
      </AsyncBoundary>
    `
  })
}

export const CustomErrorSlot: Story = {
  render: () => ({
    components: { AsyncBoundary, ErrorContent },
    template: `
      <AsyncBoundary>
        <ErrorContent />
        <template #error="{ error, retry }">
          <div class="rounded border border-danger bg-danger-light p-6 text-danger">
            <p class="font-semibold">カスタムエラー: {{ error.message }}</p>
            <button
              class="mt-3 rounded border border-border bg-surface px-4 py-2 text-sm text-body transition hover:bg-surface-light"
              @click="retry"
            >
              再試行
            </button>
          </div>
        </template>
      </AsyncBoundary>
    `
  })
}
