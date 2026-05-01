import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import NewCirclePage from './new.vue'
import { mockSessionBootstrap, mockParticipationType } from '@/mocks/data'

const canCreateSession = {
  ...mockSessionBootstrap,
  user: { ...mockSessionBootstrap.user!, canCreateCircleRegistration: true }
}

const cannotCreateSession = {
  ...mockSessionBootstrap,
  user: { ...mockSessionBootstrap.user!, canCreateCircleRegistration: false }
}

const meta = {
  title: 'Pages/Circles/New',
  component: NewCirclePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    session: {
      bootstrap: canCreateSession
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(canCreateSession)),
        http.get('/v1/participation-types', () => HttpResponse.json([mockParticipationType])),
        http.get('/v1/participation-types/:typeID/registration-form', () =>
          HttpResponse.json(mockParticipationType.form)
        ),
        http.post('/v1/circles', () => HttpResponse.json({ id: 'circle-new', name: 'テスト企画' }))
      ]
    }
  }
} satisfies Meta<typeof NewCirclePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const CannotCreate: Story = {
  tags: ['!autodocs'],
  parameters: {
    session: {
      bootstrap: cannotCreateSession
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(cannotCreateSession)),
        http.get('/v1/participation-types', () => HttpResponse.json([]))
      ]
    }
  }
}
