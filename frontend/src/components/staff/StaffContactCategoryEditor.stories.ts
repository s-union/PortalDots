import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffContactCategoryEditor from './StaffContactCategoryEditor.vue'

const meta = {
  title: 'UI/Staff/StaffContactCategoryEditor',
  component: StaffContactCategoryEditor,
  tags: ['autodocs']
} satisfies Meta<typeof StaffContactCategoryEditor>

export default meta
type Story = StoryObj<typeof meta>

const mutationHandlers = [
  http.post('/v1/staff/contact-categories', () =>
    HttpResponse.json({ id: 'cat-new', name: '新カテゴリ', email: 'new@example.com' })
  ),
  http.put('/v1/staff/contact-categories/:catId', () =>
    HttpResponse.json({ id: 'cat-1', name: '更新カテゴリ', email: 'updated@example.com' })
  ),
  http.delete('/v1/staff/contact-categories/:catId', () => new HttpResponse(null, { status: 204 }))
]

export const CreateNew: Story = {
  args: { category: null },
  parameters: {
    msw: { handlers: mutationHandlers }
  }
}

export const EditExisting: Story = {
  args: {
    category: {
      id: 'cat-1',
      name: '一般問い合わせ',
      email: 'contact@example.com'
    }
  },
  parameters: {
    msw: { handlers: mutationHandlers }
  }
}
