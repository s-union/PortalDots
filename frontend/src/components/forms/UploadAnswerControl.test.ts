import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import UploadAnswerControl from './UploadAnswerControl.vue'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer } from '@/features/forms/answers'
import { buildAnswerFormSchema, getUploadAnswerElements } from '@/features/forms/answer-form-schema'
import { toAnswerId, toQuestionId, toUploadId } from '@/lib/api/schema'

enableAutoUnmount(afterEach)

function createQuestion(overrides: Partial<FormQuestion> = {}): FormQuestion {
  return {
    id: toQuestionId('question-1'),
    name: '設問',
    description: '説明',
    type: 'upload',
    isRequired: false,
    numberMin: null,
    numberMax: null,
    allowedTypes: '',
    options: [],
    priority: 1,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides
  }
}

function uploadElement(allowedTypes = '') {
  const element = getUploadAnswerElements(buildAnswerFormSchema([createQuestion({ allowedTypes })]))[0]
  if (!element) throw new Error('Expected an upload element')
  return element
}

describe('UploadAnswerControl', () => {
  it('renders uploads and emits file events without a scalar model', async () => {
    const answer: FormAnswer = {
      id: toAnswerId('answer-1'),
      body: '',
      updatedAt: '2026-03-02T00:00:00Z',
      details: {},
      uploads: [
        {
          id: toUploadId('upload-1'),
          questionId: toQuestionId('question-1'),
          filename: 'layout.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 128,
          createdAt: '2026-03-02T10:00:00Z'
        }
      ]
    }
    const wrapper = mount(UploadAnswerControl, {
      props: {
        element: uploadElement(),
        answer,
        downloadHref: () => '/download/url',
        uploadErrorMessage: 'アップロードに失敗しました'
      }
    })
    expect(wrapper.text()).toContain('layout.pdf')
    expect(wrapper.get('a[href="/download/url"]').text()).toContain('表示')
    expect(wrapper.text()).toContain('アップロードに失敗しました')
    const file = new File(['content'], 'flyer.pdf', { type: 'application/pdf' })
    Object.defineProperty(wrapper.get('input[type="file"]').element, 'files', { configurable: true, value: [file] })
    await wrapper.get('input[type="file"]').trigger('change')
    expect(wrapper.emitted('fileChange')?.[0]).toEqual(['question-1', file])
    const upload = wrapper.findAll('button').find((button) => button.text() === 'アップロード')
    if (!upload) throw new Error('Upload button not found')
    await upload.trigger('click')
    expect(wrapper.emitted('upload')?.[0]).toEqual(['question-1'])
  })

  it('normalizes upload extensions', () => {
    const wrapper = mount(UploadAnswerControl, {
      props: {
        element: uploadElement('png|jpg|jpeg|gif'),
        answer: null,
        downloadHref: () => ''
      }
    })
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('.png,.jpg,.jpeg,.gif')
    expect(wrapper.text()).toContain('png / jpg / jpeg / gif ・1ファイル5MBまで')
  })

  it('shows the upload empty state', () => {
    const wrapper = mount(UploadAnswerControl, {
      props: { element: uploadElement(), answer: null, downloadHref: () => '/download/url' }
    })
    expect(wrapper.text()).toContain('まだファイルはアップロードされていません。')
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('shows upload progress and disables its action', () => {
    const wrapper = mount(UploadAnswerControl, {
      props: { element: uploadElement(), answer: null, downloadHref: () => '', uploadPending: true }
    })
    const pending = wrapper.findAll('button').find((button) => button.text() === '送信中...')
    if (!pending) throw new Error('Pending upload button not found')
    expect(pending.attributes('disabled')).toBeDefined()
  })
})
