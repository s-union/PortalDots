import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import DeletePage from './delete.vue'
import { mockSessionBootstrap } from '@/mocks/data'

const meta = {
  title: '一般モード/アカウント設定/アカウント削除',
  component: DeletePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrap)),
        http.delete('/v1/session/account', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof DeletePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const CannotDeleteBelongsToCircle: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        )
      ]
    }
  }
}

export const CannotDeleteStaff: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            roles: ['admin']
          })
        )
      ]
    }
  }
}
