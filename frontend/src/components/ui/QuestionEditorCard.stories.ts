import type { Meta, StoryObj } from '@storybook/vue3-vite'
import QuestionEditorCard from './QuestionEditorCard.vue'
import IconActionButton from './IconActionButton.vue'

const meta = {
  title: 'UI/Forms/QuestionEditorCard',
  component: QuestionEditorCard,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    meta: { control: 'text' }
  }
} satisfies Meta<typeof QuestionEditorCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'テキスト入力',
    meta: 'text'
  },
  render: (args) => ({
    components: { QuestionEditorCard },
    setup() {
      return { args }
    },
    template: `
      <QuestionEditorCard v-bind="args">
        <div class="text-sm text-muted">この質問の設定はここに表示されます。</div>
      </QuestionEditorCard>
    `
  })
}

export const WithActions: Story = {
  args: {
    title: '選択肢（ラジオボタン）',
    meta: 'radio'
  },
  render: (args) => ({
    components: { QuestionEditorCard, IconActionButton },
    setup() {
      return { args }
    },
    template: `
      <QuestionEditorCard v-bind="args">
        <template #actions>
          <IconActionButton title="上へ移動"><i class="fas fa-arrow-up" aria-hidden="true" /></IconActionButton>
          <IconActionButton title="下へ移動"><i class="fas fa-arrow-down" aria-hidden="true" /></IconActionButton>
          <IconActionButton variant="subtleDanger" title="削除"><i class="fas fa-trash" aria-hidden="true" /></IconActionButton>
        </template>
        <div class="grid gap-2 text-sm text-body">
          <label class="grid gap-1">
            <span class="font-medium">質問文</span>
            <input type="text" value="希望する時間帯を選んでください" />
          </label>
        </div>
      </QuestionEditorCard>
    `
  })
}
