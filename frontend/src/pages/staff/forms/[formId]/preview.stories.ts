import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { http, HttpResponse } from 'msw'
import StaffFormPreviewPage from './preview.vue'
import { mockSessionBootstrapStaff, mockPublicConfig } from '@/mocks/data'

const mockFormPreview = {
  id: 'form-1',
  name: 'テスト申請フォーム',
  description: 'テスト用の申請フォームです。',
  openAt: '2026-01-01T00:00:00Z',
  closeAt: '2026-12-31T23:59:59Z',
  answerableTags: [],
  confirmationMessage: '申請が完了しました。',
  isPublic: true,
  isOpen: true,
  maxAnswers: 1,
  questions: [
    {
      id: 'q-1',
      name: '氏名',
      description: '',
      type: 'text' as const,
      isRequired: true,
      numberMin: null,
      numberMax: null,
      allowedTypes: '',
      options: [],
      priority: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'q-2',
      name: '興味のある分野',
      description: '該当するものを選択してください。',
      type: 'checkbox' as const,
      isRequired: false,
      numberMin: null,
      numberMax: null,
      allowedTypes: '',
      options: ['技術', 'デザイン', '企画'],
      priority: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ]
}

const meta = {
  title: 'スタッフモード/申請管理/プレビュー',
  component: StaffFormPreviewPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    route: { path: '/staff/forms/form-1/preview' },
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/staff/forms/:formID/preview', () => HttpResponse.json(mockFormPreview))
      ]
    }
  }
} satisfies Meta<typeof StaffFormPreviewPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LimitedPublic: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/v1/session/bootstrap', () => HttpResponse.json(mockSessionBootstrapStaff)),
        http.get('/v1/staff/status', () => HttpResponse.json({ allowed: true, authorized: true })),
        http.get('/v1/public/config', () => HttpResponse.json(mockPublicConfig)),
        http.get('/v1/staff/forms/:formID/preview', () =>
          HttpResponse.json({
            ...mockFormPreview,
            answerableTags: ['文化系']
          })
        )
      ]
    }
  }
}
