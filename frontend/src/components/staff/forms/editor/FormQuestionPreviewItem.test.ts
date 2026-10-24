import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import {
  parseStaffFormQuestion,
  type StaffFormQuestion,
  type UpdateStaffFormQuestionPayload
} from '@/features/staff/forms/api'
import FormQuestionPreviewItem from './FormQuestionPreviewItem.vue'

enableAutoUnmount(afterEach)

function question(overrides: Partial<StaffFormQuestion> = {}): StaffFormQuestion {
  return parseStaffFormQuestion({
    id: 'question-a',
    name: '設問 A',
    description: '説明',
    type: 'text',
    isRequired: false,
    numberMin: null,
    numberMax: null,
    allowedTypes: '',
    options: [],
    priority: 1,
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
    ...overrides
  })
}

const textPayload = {
  id: 'question-a',
  name: '設問 A',
  description: '説明',
  type: 'text',
  isRequired: false,
  numberMin: null,
  numberMax: null,
  allowedTypes: '',
  options: [],
  priority: 1
}

describe('FormQuestionPreviewItem', () => {
  it('revalidates limits after a clean-field refresh while retaining the dirty limit', async () => {
    const save = vi.fn(async (payload: UpdateStaffFormQuestionPayload) => question(payload))
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question({ type: 'number', numberMax: 3 }), isOpen: true, saveQuestion: save }
    })
    await wrapper.get('#question-question-a-numberMin').setValue('5')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#question-question-a-numberMax').attributes('aria-invalid')).toBe('true')
    await wrapper.setProps({ question: question({ type: 'number', numberMax: 3, priority: 2 }) })
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#question-question-a-numberMin').element.value).toBe('5')
    expect(wrapper.get('#question-question-a-numberMax').attributes('aria-invalid')).toBe('true')
    await wrapper.setProps({ question: question({ type: 'number', numberMax: 6, priority: 2 }) })
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#question-question-a-numberMin').element.value).toBe('5')
    expect(wrapper.get<HTMLInputElement>('#question-question-a-numberMax').element.value).toBe('6')
    expect(wrapper.get('#question-question-a-numberMax').attributes('aria-invalid')).toBe('false')
    expect(save).not.toHaveBeenCalled()
  })

  it('shows server field errors on unchanged inputs and clears them on an explicit retry', async () => {
    const save = vi
      .fn<(payload: UpdateStaffFormQuestionPayload) => Promise<StaffFormQuestion>>()
      .mockRejectedValueOnce(
        new Error('Validation failed', {
          cause: { message: 'Validation failed', errors: { name: ['この設問名は使用できません'] } }
        })
      )
      .mockImplementation(async (payload) => question(payload))
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question(), isOpen: true, saveQuestion: save }
    })
    const name = wrapper.get('#question-question-a-name')
    await name.setValue('保存する設問名')
    await name.trigger('blur')
    await flushPromises()
    expect(wrapper.get('#question-question-a-name-error').text()).toBe('この設問名は使用できません')
    expect(name.attributes('aria-invalid')).toBe('true')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('#question-question-a-name-error').exists()).toBe(false)
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('completes a requested save when a refresh interrupts pending validation', async () => {
    const save = vi.fn(async (payload: UpdateStaffFormQuestionPayload) => question(payload))
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question(), isOpen: true, saveQuestion: save }
    })
    await wrapper.get('#question-question-a-name').setValue('保存する設問名')
    const saving = wrapper.get('form').trigger('submit')
    const refreshing = wrapper.setProps({ question: question({ description: '最新の説明' }) })
    await Promise.all([saving, refreshing])
    await flushPromises()
    expect(save.mock.calls).toEqual([[{ ...textPayload, name: '保存する設問名', description: '最新の説明' }]])
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('keeps later input and accepts normalized fields that have not changed since submission', async () => {
    const pending = Promise.withResolvers<StaffFormQuestion>()
    const save = vi.fn(() => pending.promise)
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question(), isOpen: true, saveQuestion: save }
    })
    const name = wrapper.get<HTMLInputElement>('#question-question-a-name')
    const description = wrapper.get<HTMLTextAreaElement>('#question-question-a-description')
    await name.setValue('  保存する設問名  ')
    await name.trigger('blur')
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    await name.setValue('保存中の追加編集')
    await description.setValue('保存中の説明')
    const result = question({ name: '保存する設問名', description: 'サーバー側の説明' })
    await wrapper.setProps({ question: result })
    pending.resolve(result)
    await flushPromises()
    expect(name.element.value).toBe('保存中の追加編集')
    expect(description.element.value).toBe('保存中の説明')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])
    expect(save.mock.calls).toEqual([[{ ...textPayload, name: '保存する設問名' }]])

    await name.setValue('保存する設問名')
    await description.setValue('サーバー側の説明')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('normalizes an unchanged submitted value and refreshes clean fields', async () => {
    const save = vi.fn(async (payload: UpdateStaffFormQuestionPayload) => question(payload))
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question(), isOpen: true, saveQuestion: save }
    })
    const name = wrapper.get<HTMLInputElement>('#question-question-a-name')
    await name.setValue('  保存する設問名  ')
    await name.trigger('blur')
    await flushPromises()
    expect(name.element.value).toBe('保存する設問名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
    await wrapper.setProps({ question: question({ name: 'サーバーで変更', description: '最新の説明', priority: 2 }) })
    expect(name.element.value).toBe('サーバーで変更')
    expect(wrapper.get<HTMLTextAreaElement>('#question-question-a-description').element.value).toBe('最新の説明')
  })

  it('serializes repeated save requests and sends the latest pending input once', async () => {
    const first = Promise.withResolvers<StaffFormQuestion>()
    const second = Promise.withResolvers<StaffFormQuestion>()
    const save = vi
      .fn<(payload: UpdateStaffFormQuestionPayload) => Promise<StaffFormQuestion>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question(), isOpen: true, saveQuestion: save }
    })
    const name = wrapper.get<HTMLInputElement>('#question-question-a-name')
    await name.setValue('最初の編集')
    await name.trigger('blur')
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    await name.setValue('途中の編集')
    await name.trigger('blur')
    await name.setValue('最後の編集')
    await name.trigger('blur')
    expect(save).toHaveBeenCalledTimes(1)
    expect(wrapper.get('form').attributes('aria-busy')).toBe('true')
    first.resolve(question({ name: '最初の編集' }))
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save.mock.calls).toEqual([
      [{ ...textPayload, name: '最初の編集' }],
      [{ ...textPayload, name: '最後の編集' }]
    ])
    second.resolve(question({ name: '最後の編集' }))
    await flushPromises()
    expect(name.element.value).toBe('最後の編集')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
    expect(wrapper.get('form').attributes('aria-busy')).toBe('false')
  })

  it('retains raw options after failure and retries the latest input on explicit submission', async () => {
    const failed = Promise.withResolvers<StaffFormQuestion>()
    const save = vi
      .fn<(payload: UpdateStaffFormQuestionPayload) => Promise<StaffFormQuestion>>()
      .mockImplementationOnce(() => failed.promise)
      .mockImplementation(async (payload) => question({ ...payload, type: 'radio' }))
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question({ type: 'radio', options: ['既存'] }), isOpen: true, saveQuestion: save }
    })
    const options = wrapper.get<HTMLTextAreaElement>('#question-question-a-options')
    await options.setValue('  選択 A  \n選択 A\n\n選択 B')
    await options.trigger('blur')
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    await options.setValue('  選択 C  \n選択 C\n選択 D\n')
    await options.trigger('blur')
    failed.reject(new Error('Request failed'))
    await flushPromises()
    expect(options.element.value).toBe('  選択 C  \n選択 C\n選択 D\n')
    expect(wrapper.get('[role="alert"]').text()).toBe('設問の保存に失敗しました。')
    expect(save).toHaveBeenCalledTimes(1)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(save.mock.calls).toEqual([
      [{ ...textPayload, type: 'radio', options: ['選択 A', '選択 B'] }],
      [{ ...textPayload, type: 'radio', options: ['選択 C', '選択 D'] }]
    ])
    expect(options.element.value).toBe('選択 C\n選択 D')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('defers autosave through reordering and sends the refreshed priority', async () => {
    const save = vi.fn(async (payload: UpdateStaffFormQuestionPayload) => question(payload))
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question(), isOpen: true, paused: true, saveQuestion: save }
    })
    const name = wrapper.get<HTMLInputElement>('#question-question-a-name')
    await name.setValue('並び替え中の入力')
    await name.trigger('blur')
    expect(save).not.toHaveBeenCalled()
    await wrapper.setProps({ question: question({ priority: 4 }), paused: false })
    await flushPromises()
    expect(save.mock.calls).toEqual([[{ ...textPayload, name: '並び替え中の入力', priority: 4 }]])
    expect(name.element.value).toBe('並び替え中の入力')
  })

  it('ignores a response after disposal and does not start a queued follow-up', async () => {
    const pending = Promise.withResolvers<StaffFormQuestion>()
    const save = vi.fn(() => pending.promise)
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question(), isOpen: true, saveQuestion: save }
    })
    const name = wrapper.get('#question-question-a-name')
    await name.setValue('最初の編集')
    await name.trigger('blur')
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    await name.setValue('破棄される編集')
    await name.trigger('blur')
    wrapper.unmount()
    pending.resolve(question({ name: '最初の編集' }))
    await flushPromises()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('validates names, options, integer limits and their relation before sending a request', async () => {
    const save = vi.fn(async (payload: UpdateStaffFormQuestionPayload) => question(payload))
    const wrapper = mount(FormQuestionPreviewItem, {
      props: { question: question({ type: 'number' }), isOpen: true, saveQuestion: save }
    })
    const name = wrapper.get('#question-question-a-name')
    const min = wrapper.get('#question-question-a-numberMin')
    const max = wrapper.get('#question-question-a-numberMax')
    await name.setValue('   ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('設問名を入力してください')
    expect(name.attributes('aria-invalid')).toBe('true')
    await name.setValue('個数')
    await min.setValue('1.5')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('整数で入力してください')
    await min.setValue('2147483648')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('値が大きすぎます')
    await min.setValue('5')
    await max.setValue('2')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('最大値は最小値以上にしてください')
    expect(save).not.toHaveBeenCalled()
    await min.setValue('-3')
    await max.setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(save.mock.calls).toEqual([[{ ...textPayload, name: '個数', type: 'number', numberMin: -3 }]])

    const radio = mount(FormQuestionPreviewItem, {
      props: { question: question({ type: 'radio', options: ['既存'] }), isOpen: true, saveQuestion: save }
    })
    await radio.get('#question-question-a-options').setValue(' \n ')
    await radio.get('form').trigger('submit')
    await flushPromises()
    expect(radio.text()).toContain('選択肢を 1 つ以上指定してください')
    expect(save).toHaveBeenCalledTimes(1)
  })
})
