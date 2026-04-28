import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import FormsIndexPage from './index.vue'
import { mockSessionBootstrap, mockForm } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Forms/Index',
  component: FormsIndexPage,
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
        http.get('/v1/forms', () =>
          HttpResponse.json([mockForm, { ...mockForm, id: 'form-2', name: '第2回申請フォーム', hasAnswer: true }])
        )
      ]
    }
  }
} satisfies Meta<typeof FormsIndexPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoForms: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/forms', () => HttpResponse.json([]))
      ]
    }
  }
}
