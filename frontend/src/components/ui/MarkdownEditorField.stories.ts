import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
// import { within, userEvent, expect } from 'storybook/test'
import MarkdownEditorField from './MarkdownEditorField.vue'

const meta = {
  title: 'UI/MarkdownEditorField',
  component: MarkdownEditorField,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
    minHeightClass: { control: 'text' }
  }
} satisfies Meta<typeof MarkdownEditorField>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: { modelValue: '', name: 'content' },
  render: () => ({
    components: { MarkdownEditorField },
    setup() {
      const content = ref('')
      return { content }
    },
    template: `<MarkdownEditorField v-model="content" name="content" placeholder="本文を入力してください" />`
  })
}

export const WithContent: Story = {
  args: { modelValue: '# テストお知らせ\n\nこれはテスト用のお知らせです。\n\n- 項目1\n- 項目2', name: 'content' },
  render: () => ({
    components: { MarkdownEditorField },
    setup() {
      const content = ref('# テストお知らせ\n\nこれはテスト用のお知らせです。\n\n- 項目1\n- 項目2')
      return { content }
    },
    template: `<MarkdownEditorField v-model="content" name="content" />`
  })
}

export const Disabled: Story = {
  args: {
    modelValue: '# 読み取り専用コンテンツ\n\nこのフィールドは無効化されています。',
    name: 'content',
    disabled: true
  },
  render: () => ({
    components: { MarkdownEditorField },
    setup() {
      const content = ref('# 読み取り専用コンテンツ\n\nこのフィールドは無効化されています。')
      return { content }
    },
    template: `<MarkdownEditorField v-model="content" name="content" :disabled="true" />`
  })
}

export const WithPreviewOpen: Story = {
  args: {
    modelValue:
      '# テストお知らせ\n\nこれはテスト用のお知らせです。\n\n- 項目1\n- 項目2\n\n**太字**や*斜体*も使えます。',
    name: 'content'
  },
  render: () => ({
    components: { MarkdownEditorField },
    setup() {
      const content = ref(
        '# テストお知らせ\n\nこれはテスト用のお知らせです。\n\n- 項目1\n- 項目2\n\n**太字**や*斜体*も使えます。'
      )
      return { content }
    },
    template: `<MarkdownEditorField v-model="content" name="content" />`
  }),
  play: async () => {
    // interaction test は今回のプロジェクトでは使用しないため無効化
  }
}
