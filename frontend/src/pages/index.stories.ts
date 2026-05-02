import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import IndexPage from './index.vue'
import { mockSessionBootstrap, mockSessionBootstrapStaff, mockPublicConfig, mockPublicHome } from '@/mocks/data'

const meta = {
  title: 'Common/Top Page',
  component: IndexPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta<typeof IndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Unauthenticated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            user: null
          })
        ),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/public/home', () => HttpResponse.json(mockPublicHome))
      ]
    }
  }
}

export const Authenticated: Story = {
  parameters: {
    session: {
      bootstrap: mockSessionBootstrap
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/public/home', () => HttpResponse.json(mockPublicHome)),
        http.get('/v1/circles', () =>
          HttpResponse.json([
            {
              id: 'circle-1',
              name: 'テストサークル',
              groupName: 'テストグループ',
              participationTypeName: '一般参加',
              submittedAt: null,
              status: 'pending'
            }
          ])
        ),
        http.get('/v1/circles/current', () => HttpResponse.json(null)),
        http.get('/v1/circles/current/detail', () => new HttpResponse(null, { status: 404 })),
        http.get('/v1/forms', () => HttpResponse.json([]))
      ]
    }
  }
}

export const StaffUser: Story = {
  parameters: {
    session: {
      bootstrap: mockSessionBootstrapStaff
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/public/home', () => HttpResponse.json(mockPublicHome)),
        http.get('/v1/circles', () => HttpResponse.json([])),
        http.get('/v1/circles/current', () => HttpResponse.json(null)),
        http.get('/v1/circles/current/detail', () => new HttpResponse(null, { status: 404 })),
        http.get('/v1/forms', () => HttpResponse.json([]))
      ]
    }
  }
}

export const DemoMode: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            user: null
          })
        ),
        http.get('/v1/public/config', () => HttpResponse.json({ ...mockPublicConfig, isDemo: true })),
        http.get('/v1/public/home', () => HttpResponse.json(mockPublicHome))
      ]
    }
  }
}
