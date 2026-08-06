import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { mockStaffUser, mockStaffUser2 } from '@/mocks/data'
import { http, HttpResponse } from 'msw'
import StaffUserPicker from './StaffUserPicker.vue'

const meta = {
  title: 'UI/Staff/StaffUserPicker',
  component: StaffUserPicker,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
    emptyMessage: { control: 'text' }
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/staff/users', () =>
          HttpResponse.json({
            items: [mockStaffUser, mockStaffUser2],
            page: 1,
            pageSize: 20,
            total: 2
          })
        ),
        http.get('/v1/staff/users/{userID}', ({ request }) =>
          HttpResponse.json(request.url.includes('staff-2') ? mockStaffUser2 : mockStaffUser)
        )
      ]
    }
  }
} satisfies Meta<typeof StaffUserPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: { modelValue: [] },
  render: () => ({
    components: { StaffUserPicker },
    setup() {
      const selectedUserIDs = ref<string[]>([])
      return { selectedUserIDs }
    },
    template: `
      <StaffUserPicker
        v-model="selectedUserIDs"
        placeholder="スタッフを検索して追加"
        empty-message="スタッフは未選択です。"
      />
    `
  })
}

export const WithSelectedUsers: Story = {
  args: { modelValue: ['staff-1', 'staff-2'] },
  render: () => ({
    components: { StaffUserPicker },
    setup() {
      const selectedUserIDs = ref(['staff-1', 'staff-2'])
      return { selectedUserIDs }
    },
    template: `
      <StaffUserPicker v-model="selectedUserIDs" />
    `
  })
}

export const Disabled: Story = {
  args: { modelValue: ['staff-1'], disabled: true },
  render: () => ({
    components: { StaffUserPicker },
    setup() {
      const selectedUserIDs = ref(['staff-1'])
      return { selectedUserIDs }
    },
    template: `
      <StaffUserPicker v-model="selectedUserIDs" :disabled="true" />
    `
  })
}
