import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SettingsRow from './SettingsRow.vue'

const meta = {
  title: 'UI/Settings/SettingsRow',
  component: SettingsRow,
  tags: ['autodocs']
} satisfies Meta<typeof SettingsRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => ({
    components: { SettingsRow },
    template: `
      <SettingsRow>
        <label class="grid gap-2 text-sm text-body">
          <span class="font-medium">アプリ名</span>
          <input type="text" value="PortalDots" />
        </label>
      </SettingsRow>
    `
  })
}

export const WithMultipleFields: Story = {
  render: () => ({
    components: { SettingsRow },
    template: `
      <div class="divide-y divide-border rounded border border-border bg-surface">
        <SettingsRow>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">姓</span>
            <input type="text" value="山田" />
          </label>
        </SettingsRow>
        <SettingsRow>
          <label class="grid gap-2 text-sm text-body">
            <span class="font-medium">名</span>
            <input type="text" value="太郎" />
          </label>
        </SettingsRow>
      </div>
    `
  })
}
