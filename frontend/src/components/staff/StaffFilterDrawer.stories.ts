import type { Meta, StoryObj } from '@storybook/vue3-vite'
import StaffFilterDrawer, { type StaffFilterField } from './StaffFilterDrawer.vue'

const meta = {
  title: 'UI/Staff/StaffFilterDrawer',
  component: StaffFilterDrawer,
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'select',
      options: ['and', 'or']
    },
    loading: { control: 'boolean' }
  }
} satisfies Meta<typeof StaffFilterDrawer>

export default meta
type Story = StoryObj<typeof meta>

const fields: StaffFilterField[] = [
  { key: 'name', label: '企画名', type: 'string' },
  { key: 'groupName', label: '団体名', type: 'string' },
  { key: 'participationTypeName', label: '参加種別', type: 'string' },
  { key: 'isSubmitted', label: '提出済み', type: 'bool' }
]

export const Empty: Story = {
  args: {
    fields,
    queries: [],
    mode: 'and',
    loading: false
  }
}

export const WithQueries: Story = {
  args: {
    fields,
    queries: [
      { id: 1, keyName: 'name', operator: 'like', value: 'テスト' },
      { id: 2, keyName: 'isSubmitted', operator: '=', value: 'true' }
    ],
    mode: 'and',
    loading: false
  }
}

export const OrMode: Story = {
  args: {
    fields,
    queries: [{ id: 1, keyName: 'name', operator: 'like', value: 'テスト' }],
    mode: 'or',
    loading: false
  }
}

export const Loading: Story = {
  args: {
    fields,
    queries: [{ id: 1, keyName: 'name', operator: 'like', value: 'サークル' }],
    mode: 'and',
    loading: true
  }
}
