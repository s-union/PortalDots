import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffPlaceEditor from './StaffPlaceEditor.vue'

const meta = {
  title: 'UI/Staff/StaffPlaceEditor',
  component: StaffPlaceEditor,
  tags: ['autodocs']
} satisfies Meta<typeof StaffPlaceEditor>

export default meta
type Story = StoryObj<typeof meta>

const mutationHandlers = [
  http.post('/v1/staff/places', () =>
    HttpResponse.json({
      id: 'place-new',
      name: '新会場',
      type: 1,
      notes: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    })
  ),
  http.put('/v1/staff/places/:placeId', () =>
    HttpResponse.json({
      id: 'place-1',
      name: '更新会場',
      type: 1,
      notes: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    })
  ),
  http.delete('/v1/staff/places/:placeId', () => new HttpResponse(null, { status: 204 }))
]

export const CreateNew: Story = {
  args: { place: null },
  parameters: {
    msw: { handlers: mutationHandlers }
  }
}

export const EditIndoor: Story = {
  args: {
    place: {
      id: 'place-1',
      name: 'メインホール',
      type: 1,
      notes: '最大収容500人',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  },
  parameters: {
    msw: { handlers: mutationHandlers }
  }
}

export const EditOutdoor: Story = {
  args: {
    place: {
      id: 'place-2',
      name: 'メインステージ（屋外）',
      type: 2,
      notes: '雨天時は使用不可',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  },
  parameters: {
    msw: { handlers: mutationHandlers }
  }
}
