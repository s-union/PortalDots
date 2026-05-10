import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffTagEditor from './StaffTagEditor.vue'

const meta = {
  title: 'UI/Staff/Tags/StaffTagEditor',
  component: StaffTagEditor,
  tags: ['autodocs'],
  argTypes: {
    tag: { control: 'object' }
  }
} satisfies Meta<typeof StaffTagEditor>

export default meta
type Story = StoryObj<typeof meta>

const tagMutationHandlers = [
  http.post('/v1/staff/tags', () =>
    HttpResponse.json({
      id: 'tag-new',
      name: '新しいタグ',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    })
  ),
  http.put('/v1/staff/tags/:tagId', () =>
    HttpResponse.json({
      id: 'tag-1',
      name: '更新されたタグ',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    })
  ),
  http.delete('/v1/staff/tags/:tagId', () => new HttpResponse(null, { status: 204 }))
]

export const CreateNew: Story = {
  args: { tag: null },
  parameters: {
    msw: { handlers: tagMutationHandlers }
  }
}

export const EditExisting: Story = {
  args: {
    tag: {
      id: 'tag-1',
      name: '文化系',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  },
  parameters: {
    msw: { handlers: tagMutationHandlers }
  }
}
