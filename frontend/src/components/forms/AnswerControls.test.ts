import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import TextAnswerControl from './TextAnswerControl.vue'
import CheckboxAnswerControl from './CheckboxAnswerControl.vue'
import UploadAnswerControl from './UploadAnswerControl.vue'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer } from '@/features/forms/answers'
import { buildAnswerFormSchema, getAnswerFormElements } from '@/features/forms/answer-form-schema'
import { toAnswerId, toQuestionId, toUploadId } from '@/lib/api/schema'

enableAutoUnmount(afterEach)

function createQuestion(overrides: Partial<FormQuestion> = {}): FormQuestion {
  return {
    id: toQuestionId('question-1'),
    name: '設問',
    description: '説明',
    type: 'text',
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

function textElement(question = createQuestion()) {
  const element = getAnswerFormElements(buildAnswerFormSchema([question]))[0]
  if (!element || element.control === 'heading' || element.control === 'upload' || element.control === 'checkbox') {
    throw new Error('Expected a text control')
  }
  return element
}

function checkboxElement() {
  const element = getAnswerFormElements(
    buildAnswerFormSchema([createQuestion({ type: 'checkbox', options: ['机', '椅子'] })])
  )[0]
  if (!element || element.control !== 'checkbox') throw new Error('Expected a checkbox control')
  return element
}

function uploadElement(allowedTypes = '') {
  const element = getAnswerFormElements(buildAnswerFormSchema([createQuestion({ type: 'upload', allowedTypes })]))[0]
  if (!element || element.control !== 'upload') throw new Error('Expected an upload control')
  return element
}

describe('typed answer controls', () => {
  it('emits text changes and renders the parent value', async () => {
    const wrapper = mount(TextAnswerControl, { props: { element: textElement(), modelValue: '現在の回答' } })
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('現在の回答')
    await wrapper.get('input').setValue('山田太郎')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['山田太郎'])
    await wrapper.setProps({ modelValue: '別の回答' })
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('別の回答')
  })

  it('emits checkbox changes without mutating the parent array', async () => {
    const initialValue = ['椅子']
    const wrapper = mount(CheckboxAnswerControl, { props: { element: checkboxElement(), modelValue: initialValue } })
    const checkboxes = wrapper.findAll<HTMLInputElement>('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)
    await checkboxes[0].setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['椅子', '机']])
    expect(initialValue).toEqual(['椅子'])
    await wrapper.setProps({ modelValue: ['椅子', '机'] })
    await checkboxes[0].setValue(false)
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([['椅子']])
    await wrapper.setProps({ modelValue: [] })
    expect(checkboxes.every((checkbox) => !checkbox.element.checked)).toBe(true)
  })

  it('emits select and radio changes', async () => {
    const select = mount(TextAnswerControl, {
      props: {
        element: textElement(createQuestion({ type: 'select', options: ['A', 'B'] })),
        modelValue: ''
      }
    })
    await select.get('select').setValue('B')
    expect(select.emitted('update:modelValue')?.[0]).toEqual(['B'])
    const radio = mount(TextAnswerControl, {
      props: {
        element: textElement(createQuestion({ type: 'radio', options: ['はい', 'いいえ'] })),
        modelValue: ''
      }
    })
    await radio.findAll('input[type="radio"]')[1].setValue(true)
    expect(radio.emitted('update:modelValue')?.[0]).toEqual(['いいえ'])
  })

  it('emits markdown changes', async () => {
    const wrapper = mount(TextAnswerControl, {
      props: { element: textElement(createQuestion({ type: 'markdown' })), modelValue: '' }
    })
    await wrapper.get('textarea').setValue('**強調** できます')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['**強調** できます'])
  })

  it('renders bounded numeric questions as a dropdown with string values', async () => {
    const wrapper = mount(TextAnswerControl, {
      props: {
        element: textElement(createQuestion({ type: 'number', numberMin: 2, numberMax: 4 })),
        modelValue: ''
      }
    })
    expect(wrapper.findAll('select option').map((option) => option.text())).toEqual(['選択してください', '2', '3', '4'])
    await wrapper.get('select').setValue('3')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['3'])
  })

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

  it('disables text controls', () => {
    const wrapper = mount(TextAnswerControl, { props: { element: textElement(), modelValue: '', disabled: true } })
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
  })
})
