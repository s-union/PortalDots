import type { Meta, StoryObj } from '@storybook/vue3-vite'
import FaIcon from './FaIcon.vue'
import IconActionButton from './IconActionButton.vue'
import QuestionEditorCard from './QuestionEditorCard.vue'

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
    components: { FaIcon, QuestionEditorCard, IconActionButton },
    setup() {
      return { args }
    },
    template: `
      <QuestionEditorCard v-bind="args">
        <template #actions>
          <IconActionButton title="上へ移動"><FaIcon name="arrow-up" /></IconActionButton>
          <IconActionButton title="下へ移動"><FaIcon name="arrow-down" /></IconActionButton>
          <IconActionButton variant="subtleDanger" title="削除"><FaIcon name="trash" /></IconActionButton>
        </template>
        <div class="text-sm text-muted">この質問の設定はここに表示されます。</div>
      </QuestionEditorCard>
    `
  })
}
