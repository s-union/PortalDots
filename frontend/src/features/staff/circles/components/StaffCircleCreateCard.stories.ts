import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive } from 'vue'
import StaffCircleCreateCard from './StaffCircleCreateCard.vue'
import type { MutateStaffCirclePayload } from '@/features/staff/circles/api'

const defaultForm = (): MutateStaffCirclePayload => ({
  name: '理大祭カフェ',
  nameYomi: 'リダイサイカフェ',
  groupName: 'カフェ研究会',
  groupNameYomi: 'カフェケンキュウカイ',
  participationTypeId: 'type-1',
  notes: '',
  status: 'pending',
  statusReason: '',
  placeIds: ['place-1']
})

const meta = {
  title: 'Features/Staff/Circles/StaffCircleCreateCard',
  component: StaffCircleCreateCard,
  tags: ['autodocs'],
  argTypes: {
    errorMessage: { control: 'text' },
    isPending: { control: 'boolean' }
  },
  args: {
    form: defaultForm(),
    participationTypes: [
      { id: 'type-1', name: '一般参加' },
      { id: 'type-2', name: '食品販売' }
    ],
    places: [
      { id: 'place-1', name: '講義棟前' },
      { id: 'place-2', name: '体育館' }
    ],
    errorMessage: '',
    isPending: false
  },
  render: (args) => ({
    components: { StaffCircleCreateCard },
    setup() {
      const form = reactive(defaultForm())
      return { args, form }
    },
    template: `
      <StaffCircleCreateCard
        v-bind="args"
        v-model:form="form"
        class="max-w-3xl"
      />
    `
  })
} satisfies Meta<typeof StaffCircleCreateCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Rejected: Story = {
  args: {
    form: defaultForm()
  },
  render: (args) => ({
    components: { StaffCircleCreateCard },
    setup() {
      const form = reactive({
        ...defaultForm(),
        status: 'rejected' as const,
        statusReason: '提出内容に不足があります。使用場所と責任者情報を確認してください。'
      })
      return { args, form }
    },
    template: `
      <StaffCircleCreateCard
        v-bind="args"
        v-model:form="form"
        class="max-w-3xl"
      />
    `
  })
}

export const WithError: Story = {
  args: {
    errorMessage: '企画名は必須です。'
  }
}

export const Pending: Story = {
  args: {
    isPending: true
  }
}
