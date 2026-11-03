import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from '@/mocks/openapi'
import StaffPageCreatePage from './create.vue'
import { mockSessionBootstrapStaff, mockDocument } from '@/mocks/data'
import { expect, userEvent, waitFor, within } from 'storybook/test'

const meta = {
  title: 'Pages/Staff/Notices/Create New',
  component: StaffPageCreatePage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/staff/tags', () =>
          HttpResponse.json([
            { id: 'tag-1', name: '文化系', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }
          ])
        ),
        http.get('/v1/staff/documents', () =>
          HttpResponse.json([
            {
              circle: { id: 'circle-1', name: 'テストサークル' },
              ...mockDocument,
              notes: '',
              filename: 'test.pdf',
              mimeType: 'application/pdf',
              isPublic: true,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-15T12:00:00Z'
            }
          ])
        ),
        http.post('/v1/staff/pages', () =>
          HttpResponse.json({
            id: 'page-new',
            title: '新規お知らせ',
            body: '新規作成されたお知らせです。',
            notes: '',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            publishedAt: '2026-01-01T00:00:00Z',
            isPinned: false,
            isPublic: true,
            viewableTags: [],
            documentIds: [],
            documents: []
          })
        )
      ]
    }
  }
} satisfies Meta<typeof StaffPageCreatePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ServerFieldError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/v1/staff/pages', () =>
          HttpResponse.json(
            { message: 'Validation failed', errors: { body: ['本文を確認してください'] } },
            { status: 422 }
          )
        ),
        ...meta.parameters.msw.handlers
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const title = await canvas.findByLabelText(/タイトル/)
    const body = canvas.getByLabelText(/本文/)
    await userEvent.type(title, 'お知らせのタイトル')
    await userEvent.type(body, 'お知らせの本文')
    await userEvent.click(canvas.getByRole('button', { name: '作成' }))
    await waitFor(async () => {
      await expect(body).toHaveAttribute('aria-invalid', 'true')
      await expect(body).toHaveFocus()
      await expect(canvas.getAllByText('本文を確認してください').length).toBeGreaterThan(0)
    })
    await userEvent.type(body, 'を修正')
    await waitFor(() => expect(body).toHaveAttribute('aria-invalid', 'false'))
  }
}
