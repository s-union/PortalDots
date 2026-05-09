import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import JoinCirclePage from './[token].vue'
import { mockSessionBootstrap, mockCircle } from '@/mocks/data'

const meta = {
  title: 'Circle Registration/Join from Invitation Link',
  component: JoinCirclePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.post('/v1/circles/join/:token', () => HttpResponse.json(mockCircle))
      ]
    }
  }
} satisfies Meta<typeof JoinCirclePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NotAuthenticated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            csrfToken: 'mock-csrf-token',
            featureFlags: [],
            roles: [],
            permissions: [],
            currentCircle: null,
            user: null
          })
        ),
        http.post('/v1/circles/join/:token', () => HttpResponse.json(mockCircle))
      ]
    }
  }
}

export const JoinError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.post('/v1/circles/join/:token', () => HttpResponse.json({ message: 'invalid_token' }, { status: 422 }))
      ]
    }
  }
}
