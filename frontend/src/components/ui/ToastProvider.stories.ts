import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent } from 'vue'
import ToastProvider from './ToastProvider.vue'
import { dismissToast, toasts, useToast } from './useToast'

const Demo = defineComponent({
  template: `
    <div class="flex flex-wrap gap-2">
      <button type="button" @click="success">成功</button>
      <button type="button" @click="info">情報</button>
      <button type="button" @click="error">エラー</button>
      <button type="button" @click="persistent">消えない通知</button>
      <button type="button" @click="long">長いメッセージ</button>
      <button type="button" @click="clearAll">すべて閉じる</button>
    </div>
  `,
  setup() {
    const toast = useToast()
    return {
      success: () => toast.success('保存しました'),
      info: () => toast.info('新しいお知らせがあります'),
      error: () => toast.error('エラーが発生しました'),
      persistent: () => toast.success('消えない通知', { duration: 0 }),
      long: () =>
        toast.info(
          'これは改行のない長い未分割のメッセージです。画面からはみ出さずに折り返されることを確認してください。'.repeat(
            6
          )
        ),
      clearAll: () => {
        for (const toastItem of toasts.value) {
          dismissToast(toastItem.id)
        }
      }
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

export const AllTypes: Story = {
  render: () => ({
    components: { ToastProvider, Demo },
    template: `<ToastProvider><Demo /></ToastProvider>`
  })
}

export const Interactive: Story = {
  render: () => ({
    components: { ToastProvider, Demo },
    template: `<ToastProvider><Demo /></ToastProvider>`
  })
}

export const LongMessage: Story = {
  render: () => ({
    components: { ToastProvider, Demo },
    template: `<ToastProvider><Demo /></ToastProvider>`
  })
}
