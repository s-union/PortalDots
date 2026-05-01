import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { within, userEvent, expect } from 'storybook/test'
import FormEditorSidebar from './FormEditorSidebar.vue'

const meta = {
  title: 'UI/Staff/Forms/Editor/FormEditorSidebar',
  component: FormEditorSidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof FormEditorSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { FormEditorSidebar },
    template: `
      <div style="height: 600px; width: 240px; border: 1px solid var(--color-border)">
        <FormEditorSidebar @add-question="(type) => console.log('add:', type)" />
      </div>
    `
  })
}

export const ClickAddText: Story = {
  render: () => ({
    components: { FormEditorSidebar },
    template: `
      <div style="height: 600px; width: 240px; border: 1px solid var(--color-border)">
        <FormEditorSidebar @add-question="(type) => alert('追加: ' + type)" />
      </div>
    `
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const textButton = canvas.getByText('一行テキスト')
    await expect(textButton).toBeInTheDocument()
    await userEvent.click(textButton)
  }
}
