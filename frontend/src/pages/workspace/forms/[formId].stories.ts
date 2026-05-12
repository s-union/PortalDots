import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import FormDetailPage from './[formId].vue'
import { mockSessionBootstrap, mockForm } from '@/mocks/data'

const meta = {
  title: 'Pages/Workspace/Forms/Detail',
  component: FormDetailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: {
      path: '/workspace/forms/form-1'
    },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/forms/{formID}', () =>
          HttpResponse.json({
            ...mockForm,
            currentCircleStatus: 'approved',
            questions: [
              {
                id: 'q-1',
                name: '申請内容',
                description: '',
                type: 'textarea',
                isRequired: true,
                numberMin: null,
                numberMax: null,
                allowedTypes: '',
                options: [],
                priority: 1,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
              }
            ]
          })
        ),
        http.get('/v1/forms/{formID}/answer', () => HttpResponse.json({ answer: null })),
        http.put('/v1/forms/{formID}/answer', () => new HttpResponse(null, { status: 204 }))
      ]
    }
  }
} satisfies Meta<typeof FormDetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithExistingAnswer: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () =>
          HttpResponse.json({
            ...mockSessionBootstrap,
            currentCircle: { id: 'circle-1', name: 'テストサークル' }
          })
        ),
        http.get('/v1/forms/{formID}', () =>
          HttpResponse.json({
            ...mockForm,
            currentCircleStatus: 'approved',
            questions: []
          })
        ),
        http.get('/v1/forms/{formID}/answer', () =>
          HttpResponse.json({
            answer: {
              id: 'ans-1',
              body: '{}',
              updatedAt: '2026-01-15T10:00:00Z',
              details: {},
              uploads: []
            }
          })
        )
      ]
    }
  }
}
