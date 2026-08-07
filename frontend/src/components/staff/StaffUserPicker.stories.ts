import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { mockStaffUser, mockStaffUser2 } from '@/mocks/data'
import { http, HttpResponse } from 'msw'
import StaffUserPicker from './StaffUserPicker.vue'

const allUsers = [mockStaffUser, mockStaffUser2]

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
        http.get('/v1/staff/forms/recipient-candidates', ({ request }) => {
          const url = new URL(request.url)
          const query = (url.searchParams.get('query') ?? '').trim().toLowerCase()
          const items = query
            ? allUsers.filter((user) =>
                [user.displayName, ...(user.loginIds ?? [])].some((field) => field.toLowerCase().includes(query))
              )
            : allUsers
          return HttpResponse.json({ items, page: 1, pageSize: 20, total: items.length })
        }),
        http.get('/v1/staff/forms/recipient-candidates/{userID}', ({ params }) =>
          HttpResponse.json(params.userID === 'staff-2' ? mockStaffUser2 : mockStaffUser)
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

export const MidSearchWithResults: Story = {
  args: { modelValue: [], initialSearchQuery: '鈴木' },
  render: () => ({
    components: { StaffUserPicker },
    setup() {
      const selectedUserIDs = ref<string[]>([])
      return { selectedUserIDs }
    },
    template: `
      <StaffUserPicker v-model="selectedUserIDs" initial-search-query="鈴木" />
    `
  })
}

export const NoResults: Story = {
  args: { modelValue: [], initialSearchQuery: '存在しない' },
  render: () => ({
    components: { StaffUserPicker },
    setup() {
      const selectedUserIDs = ref<string[]>([])
      return { selectedUserIDs }
    },
    template: `
      <StaffUserPicker v-model="selectedUserIDs" initial-search-query="存在しない" />
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
