import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import type { StaffFormDetail } from '@/features/staff/forms/api'

vi.mock('@/features/staff/forms/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/staff/forms/api')>('@/features/staff/forms/api')
  return {
    ...actual,
    buildStaffFormUploadDownloadUrl: (formId: string, uploadId: string) => `/download/${formId}/${uploadId}`
  }
})

import FormAnswerPreviewPanel from './FormAnswerPreviewPanel.vue'

function createForm(overrides: Partial<StaffFormDetail> = {}): StaffFormDetail {
  return {
    id: 'form-1',
    name: '展示申請フォーム',
    description: '説明',
    openAt: '2026-03-01T00:00:00Z',
    closeAt: '2026-03-31T23:59:59Z',
    maxAnswers: 1,
    isPublic: true,
    isOpen: true,
    isParticipationForm: false,
    answerableTags: [],
    confirmationMessage: '',
    questions: [
      {
        id: 'question-heading',
        name: '見出し',
        description: '見出しの説明',
        type: 'heading',
        isRequired: false,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: [],
        priority: 1,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z'
      },
      {
        id: 'question-checkbox',
        name: '必要設備',
        description: '複数選択',
        type: 'checkbox',
        isRequired: false,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: ['机', '椅子'],
        priority: 2,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z'
      },
      {
        id: 'question-textarea',
        name: '詳細',
        description: 'テキストエリア',
        type: 'textarea',
        isRequired: false,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: [],
        priority: 3,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z'
      },
      {
        id: 'question-text',
        name: '責任者',
        description: '単一入力',
        type: 'text',
        isRequired: true,
        numberMin: null,
        numberMax: null,
        allowedTypes: '',
        options: [],
        priority: 4,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z'
      },
      {
        id: 'question-upload',
        name: '添付資料',
        description: 'ファイル',
        type: 'upload',
        isRequired: false,
        numberMin: null,
        numberMax: null,
        allowedTypes: 'pdf',
        options: [],
        priority: 5,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z'
      }
    ],
    answer: {
      id: 'answer-1',
      body: '',
      updatedAt: '2026-03-10T10:00:00Z',
      details: {
        'question-checkbox': ['机', '椅子'],
        'question-textarea': ['複数行\nテキスト'],
        'question-text': ['山田太郎']
      },
      uploads: [
        {
          id: 'upload-1',
          questionId: 'question-upload',
          filename: 'layout.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 128,
          createdAt: '2026-03-10T11:00:00Z'
        }
      ]
    },
    ...overrides
  }
}

describe('FormAnswerPreviewPanel', () => {
  it('renders answer details, upload links, and management link', () => {
    const wrapper = mount(FormAnswerPreviewPanel, {
      props: {
        formId: 'form-1',
        form: createForm()
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    })

    expect(wrapper.text()).toContain('現在企画の回答')
    expect(wrapper.text()).toContain('last updated: 2026-03-10T10:00:00Z')
    expect(wrapper.text()).toContain('机, 椅子')
    expect(wrapper.text()).toContain('複数行\nテキスト')
    expect(wrapper.text()).toContain('山田太郎')
    expect(wrapper.text()).toContain('layout.pdf')
    expect(wrapper.text()).toContain('1 件')
    expect(wrapper.get('a[href="/download/form-1/upload-1"]').text()).toContain('ダウンロード')

    const managementLink = wrapper.getComponent(RouterLinkStub)
    expect(managementLink.props('to')).toBe('/staff/forms/form-1/answers')
  })

  it('hides management link for participation form and shows empty states', () => {
    const wrapper = mount(FormAnswerPreviewPanel, {
      props: {
        formId: 'form-1',
        isParticipationForm: true,
        form: createForm({
          answer: null
        })
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    })

    expect(wrapper.text()).toContain('参加登録フォームの回答管理はここでは行えません。')
    expect(wrapper.text()).toContain('まだ回答はありません。')
    expect(wrapper.text()).toContain('添付ファイルはまだありません。')
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false)
  })
})
