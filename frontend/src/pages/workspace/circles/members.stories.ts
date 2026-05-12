import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import MembersPage from './members.vue'
import { mockSessionBootstrap, mockCircle } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Circles/Members',
  component: MembersPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/circles/current/detail', () => HttpResponse.json(mockCircle)),
        http.get('/v1/circles/current/members', () =>
          HttpResponse.json([
            { userId: 'user-1', displayName: '山田 太郎', isLeader: true },
            { userId: 'user-2', displayName: '田中 花子', isLeader: false }
          ])
        ),
        http.delete('/v1/circles/current/members/{userID}', () => new HttpResponse(null, { status: 204 })),
        http.post('/v1/circles/current/invitation-token/regenerate', () =>
          HttpResponse.json({ invitationToken: 'new-token-xyz' })
        )
      ]
    }
  }
} satisfies Meta<typeof MembersPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SingleMember: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/circles/current/detail', () =>
          HttpResponse.json({
            ...mockCircle,
            memberCount: 1,
            canSubmit: false
          })
        ),
        http.get('/v1/circles/current/members', () =>
          HttpResponse.json([{ userId: 'user-1', displayName: '山田 太郎', isLeader: true }])
        ),
        http.post('/v1/circles/current/invitation-token/regenerate', () =>
          HttpResponse.json({ invitationToken: 'new-token-xyz' })
        )
      ]
    }
  }
}
