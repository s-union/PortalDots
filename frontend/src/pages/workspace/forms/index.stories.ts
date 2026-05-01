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

export const MixedStatus: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/forms', () =>
          HttpResponse.json([
            {
              ...mockForm,
              id: 'form-open-limited',
              name: '食品販売申請',
              description: '食品を扱う企画のみ回答が必要な申請です。',
              answerableTags: [{ id: 'tag-food', name: '食品販売' }]
            },
            {
              ...mockForm,
              id: 'form-answered',
              name: '備品貸出申請',
              hasAnswer: true
            },
            {
              ...mockForm,
              id: 'form-closed',
              name: '締切済み申請',
              isOpen: false,
              closeAt: '2026-01-10T23:59:59Z'
            }
          ])
        )
      ]
    }
  }
}
