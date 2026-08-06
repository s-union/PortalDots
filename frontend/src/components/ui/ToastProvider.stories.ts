import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent } from 'vue'
import ToastProvider from './ToastProvider.vue'
import { useToast } from './useToast'

const Demo = defineComponent({
  template: `
    <div class="flex flex-wrap gap-2">
      <button type="button" @click="success">成功</button>
      <button type="button" @click="info">情報</button>
      <button type="button" @click="error">エラー</button>
    </div>
  `,
  setup() {
    const toast = useToast()
    return {
      success: () => toast.success('保存しました'),
      info: () => toast.info('新しいお知らせがあります'),
      error: () => toast.error('エラーが発生しました')
    }
  }
})

const meta = {
  title: 'UI/Feedback/ToastProvider',
  component: ToastProvider,
  tags: ['autodocs']
} satisfies Meta<typeof ToastProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Stack: Story = {
  render: () => ({
    components: { ToastProvider, Demo },
    template: `<ToastProvider><Demo /></ToastProvider>`
  })
}
