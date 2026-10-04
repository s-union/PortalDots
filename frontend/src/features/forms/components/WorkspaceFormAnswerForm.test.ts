import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { FormDetail, FormQuestion } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'
import { toAnswerId, toFormId, toQuestionId, toUploadId } from '@/lib/api/schema'
import WorkspaceFormAnswerForm from './WorkspaceFormAnswerForm.vue'

enableAutoUnmount(afterEach)

function createQuestion(overrides: Partial<FormQuestion> = {}): FormQuestion {
  return {
    id: toQuestionId('q-text'),
    name: '企画名',
    description: '',
    type: 'text',
    isRequired: true,
    isPermanent: false,
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

function createForm(questions = [createQuestion()]): FormDetail {
  return {
    id: toFormId('form-1'),
    name: '参加申請',
    description: '',
    openAt: '2026-03-01T00:00:00Z',
    closeAt: '2026-03-31T23:59:59Z',
    maxAnswers: 2,
    answerableTags: [],
    confirmationMessage: '',
    isPublic: true,
    isOpen: true,
    currentCircleStatus: 'approved',
    questions
  }
}

function createAnswer(overrides: Partial<FormAnswer> = {}): FormAnswer {
  return {
    id: toAnswerId('answer-1'),
    body: '',
    updatedAt: '2026-03-02T00:00:00Z',
    details: { 'q-text': ['保存済みの企画名'] },
    uploads: [],
    ...overrides
  }
}

function mountForm(
  overrides: Partial<InstanceType<typeof WorkspaceFormAnswerForm>['$props']> = {},
  attachTo?: HTMLElement
) {
  const saveAnswer = vi.fn<(draft: FormAnswerDraft) => Promise<FormAnswer | null>>().mockResolvedValue(null)
  const wrapper = mount(WorkspaceFormAnswerForm, {
    attachTo,
    props: {
      form: createForm(),
      answer: null,
      disabled: false,
      saveAnswer,
      selectedFiles: {},
      uploadPending: false,
      uploadErrorMessages: {},
      downloadHref: (questionId: string) => `/answers/answer-1/${questionId}/download`,
      errorMessage: '',
      ...overrides
    }
  })
  return { wrapper, saveAnswer }
}

describe('WorkspaceFormAnswerForm', () => {
  it('renders every question kind in definition order and submits only answer fields', async () => {
    const questions = [
      createQuestion({
        id: toQuestionId('q-heading-start'),
        name: '概要セクション',
        description: '企画の概要を記入してください',
        type: 'heading',
        isRequired: false
      }),
      createQuestion(),
      createQuestion({ id: toQuestionId('q-textarea'), name: '企画説明', type: 'textarea' }),
      createQuestion({ id: toQuestionId('q-markdown'), name: '注意事項', type: 'markdown' }),
      createQuestion({
        id: toQuestionId('q-heading-equipment'),
        name: '設備セクション',
        type: 'heading',
        isRequired: false
      }),
      createQuestion({
        id: toQuestionId('q-number-select'),
        name: '貸出台数',
        type: 'number',
        numberMin: 1,
        numberMax: 3
      }),
      createQuestion({
        id: toQuestionId('q-number-input'),
        name: '想定来場者数',
        type: 'number',
        numberMin: 1,
        numberMax: 500
      }),
      createQuestion({
        id: toQuestionId('q-select'),
        name: '開催場所',
        type: 'select',
        options: ['会議室', '屋外']
      }),
      createQuestion({
        id: toQuestionId('q-radio'),
        name: '電源利用',
        type: 'radio',
        options: ['利用する', '利用しない']
      }),
      createQuestion({
        id: toQuestionId('q-checkbox'),
        name: '借用備品',
        type: 'checkbox',
        options: ['机', '椅子']
      }),
      createQuestion({
        id: toQuestionId('q-upload'),
        name: '添付資料',
        type: 'upload',
        allowedTypes: 'pdf|png',
        isRequired: false
      })
    ]
    const { wrapper, saveAnswer } = mountForm({ form: createForm(questions) })

    expect(wrapper.findAll('h2').map((heading) => heading.text())).toEqual(['概要セクション', '設備セクション'])
    const labelPositions = questions.map((question) => wrapper.text().indexOf(question.name))
    expect(labelPositions.every((position) => position >= 0)).toBe(true)
    expect(labelPositions).toEqual([...labelPositions].sort((a, b) => a - b))
    expect(wrapper.text()).toContain('企画の概要を記入してください')
    expect(wrapper.text().match(/必須/g)).toHaveLength(8)

    const boundedNumber = wrapper.get('select[aria-label="貸出台数"]')
    expect(boundedNumber.findAll('option').map((option) => option.text())).toEqual(['選択してください', '1', '2', '3'])
    const wideNumber = wrapper.get('input[type="number"][aria-label="想定来場者数"]')
    expect(wideNumber.attributes('min')).toBe('1')
    expect(wideNumber.attributes('max')).toBe('500')
    const select = wrapper.get('select[aria-label="開催場所"]')
    expect(select.findAll('option').map((option) => option.text())).toEqual(['選択してください', '会議室', '屋外'])
    expect(
      wrapper
        .findAll('label')
        .filter((label) => label.find('input[type="radio"]').exists())
        .map((label) => label.text())
    ).toEqual(['利用する', '利用しない'])
    expect(
      wrapper
        .findAll('label')
        .filter((label) => label.find('input[type="checkbox"]').exists())
        .map((label) => label.text())
    ).toEqual(['机', '椅子'])
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('.pdf,.png')
    expect(wrapper.find('button[title="太字"]').exists()).toBe(true)

    await wrapper.get('input[type="text"][aria-label="企画名"]').setValue('展示企画')
    await wrapper.get('textarea[aria-label="企画説明"]').setValue('一行目\n二行目')
    await wrapper.get('textarea[name="q-markdown"]').setValue('**注意**してください')
    await boundedNumber.setValue('2')
    await wideNumber.setValue('250')
    await select.setValue('屋外')
    await wrapper.get('input[type="radio"][name="q-radio"][value="利用しない"]').setValue(true)
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(saveAnswer).toHaveBeenCalledWith({
      'q-text': '展示企画',
      'q-textarea': '一行目\n二行目',
      'q-markdown': '**注意**してください',
      'q-number-select': '2',
      'q-number-input': '250',
      'q-select': '屋外',
      'q-radio': '利用しない',
      'q-checkbox': ['机', '椅子']
    })
  })

  it('applies changed labels, options, controls and required validation when the definition is remounted', async () => {
    const original = mountForm({
      form: createForm([
        createQuestion({
          id: toQuestionId('q-choice'),
          name: '旧設問',
          type: 'select',
          options: ['A', 'B'],
          isRequired: false
        })
      ])
    })
    expect(
      original.wrapper
        .get('select[aria-label="旧設問"]')
        .findAll('option')
        .map((option) => option.text())
    ).toEqual(['選択してください', 'A', 'B'])
    expect(original.wrapper.text()).not.toContain('必須')
    await original.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(original.saveAnswer).toHaveBeenCalledWith({ 'q-choice': '' })
    original.wrapper.unmount()

    const updated = mountForm({
      form: createForm([
        createQuestion({
          id: toQuestionId('q-choice'),
          name: '参加区分',
          description: '参加する単位を選んでください',
          type: 'radio',
          options: ['個人', '団体'],
          isRequired: true
        })
      ])
    })
    expect(updated.wrapper.find('select').exists()).toBe(false)
    expect(updated.wrapper.text()).not.toContain('旧設問')
    expect(updated.wrapper.text()).toContain('参加区分')
    expect(updated.wrapper.text()).toContain('参加する単位を選んでください')
    expect(updated.wrapper.text()).toContain('必須')
    expect(updated.wrapper.findAll('input[type="radio"]').map((input) => input.attributes('value'))).toEqual([
      '個人',
      '団体'
    ])
    await updated.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(updated.wrapper.text()).toContain('参加区分を入力してください')
    expect(updated.saveAnswer).not.toHaveBeenCalled()

    await updated.wrapper.get('input[type="radio"][value="団体"]').setValue(true)
    await updated.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(updated.wrapper.text()).not.toContain('参加区分を入力してください')
    expect(updated.saveAnswer).toHaveBeenCalledWith({ 'q-choice': '団体' })
  })

  it('refreshes descriptions and allowed file types without discarding unsaved input', async () => {
    const textQuestion = createQuestion({ description: '変更前の説明文' })
    const uploadQuestion = createQuestion({
      id: toQuestionId('q-upload'),
      name: '添付資料',
      type: 'upload',
      allowedTypes: 'pdf',
      isRequired: false
    })
    const { wrapper } = mountForm({ form: createForm([textQuestion, uploadQuestion]) })

    expect(wrapper.text()).toContain('変更前の説明文')
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('.pdf')
    await wrapper.get('input[type="text"]').setValue('編集中の企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])

    await wrapper.setProps({
      form: createForm([
        { ...textQuestion, description: '更新された説明文' },
        { ...uploadQuestion, allowedTypes: 'png|jpg' }
      ])
    })
    await flushPromises()

    expect(wrapper.text()).toContain('更新された説明文')
    expect(wrapper.text()).not.toContain('変更前の説明文')
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('.png,.jpg')
    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('編集中の企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])
  })

  it('validates an untouched required field only after focus leaves it before the first submit', async () => {
    const { wrapper, saveAnswer } = mountForm()
    const input = wrapper.get('input[type="text"]')

    await flushPromises()
    expect(wrapper.text()).not.toContain('企画名を入力してください')

    await input.trigger('focusin')
    await flushPromises()
    expect(wrapper.text()).not.toContain('企画名を入力してください')

    await input.trigger('focusout')
    await flushPromises()
    expect(wrapper.text()).toContain('企画名を入力してください')
    expect(saveAnswer).not.toHaveBeenCalled()

    await input.setValue('展示企画')
    await flushPromises()
    expect(wrapper.text()).not.toContain('企画名を入力してください')
  })

  it('rejects required fields and submits once the value has been corrected', async () => {
    const { wrapper, saveAnswer } = mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(saveAnswer).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('企画名を入力してください')

    await wrapper.get('input[type="text"]').setValue('展示企画')
    await wrapper.get('input[type="text"]').trigger('blur')
    await flushPromises()

    expect(wrapper.text()).not.toContain('企画名を入力してください')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(saveAnswer).toHaveBeenCalledWith({ 'q-text': '展示企画' })
  })

  it.each<FormQuestion['type']>(['text', 'textarea', 'markdown', 'number', 'select', 'radio', 'checkbox'])(
    'focuses the first invalid %s control on submit',
    async (type) => {
      const { wrapper, saveAnswer } = mountForm(
        {
          form: createForm([
            createQuestion({ id: toQuestionId('q-optional'), isRequired: false }),
            createQuestion({ id: toQuestionId('q-required'), type, options: ['机', '椅子'] })
          ])
        },
        document.body
      )

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(saveAnswer).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(wrapper.get('[name="q-required"]').element)
    }
  )

  it.each<FormQuestion['type']>(['radio', 'checkbox'])(
    'focuses the next available %s option when the first option cannot receive focus',
    async (type) => {
      const { wrapper } = mountForm(
        { form: createForm([createQuestion({ type, options: ['机', '椅子'] })]) },
        document.body
      )
      const inputs = wrapper.findAll<HTMLInputElement>('input')
      inputs[0].element.disabled = true

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(document.activeElement).toBe(inputs[1].element)
    }
  )

  it('keeps checkbox values as a string array through validation and submission', async () => {
    const { wrapper, saveAnswer } = mountForm({
      form: createForm([
        createQuestion({ id: toQuestionId('q-checkbox'), name: '備品', type: 'checkbox', options: ['机', '椅子'] })
      ])
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('備品を選択してください')
    expect(saveAnswer).not.toHaveBeenCalled()

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    await checkboxes[0].setValue(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(saveAnswer).toHaveBeenCalledWith({ 'q-checkbox': ['椅子'] })
    expect(wrapper.text()).not.toContain('備品を選択してください')
  })

  it('rejects decimal values in an integer question and accepts an integer correction', async () => {
    const { wrapper, saveAnswer } = mountForm({
      form: createForm([createQuestion({ id: toQuestionId('q-number'), name: '人数', type: 'number' })])
    })
    const input = wrapper.get('input[type="number"]')

    await input.setValue('1.5')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('整数を入力してください')
    expect(saveAnswer).not.toHaveBeenCalled()

    await input.setValue('2')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).not.toContain('整数を入力してください')
    expect(saveAnswer).toHaveBeenCalledWith({ 'q-number': '2' })
  })

  it('restores the clean state when a checkbox is toggled back to its initial selection', async () => {
    const { wrapper } = mountForm({
      form: createForm([
        createQuestion({ id: toQuestionId('q-checkbox'), name: '備品', type: 'checkbox', options: ['机', '椅子'] })
      ]),
      answer: createAnswer({ details: { 'q-checkbox': ['椅子'] } })
    })
    const checkbox = wrapper.findAll<HTMLInputElement>('input[type="checkbox"]')[1]

    expect(checkbox.element.checked).toBe(true)
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])

    await checkbox.setValue(false)
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])

    await checkbox.setValue(true)
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('resets the dirty baseline to the server response after a successful save', async () => {
    const { wrapper, saveAnswer } = mountForm({ answer: createAnswer() })
    const savedAnswer = createAnswer({ details: { 'q-text': ['変更後の企画名'] } })
    saveAnswer.mockResolvedValueOnce(savedAnswer)

    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
    await wrapper.get('input[type="text"]').setValue('変更後の企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(saveAnswer).toHaveBeenCalledWith({ 'q-text': '変更後の企画名' })
    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('変更後の企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])

    await wrapper.get('input[type="text"]').setValue('保存済みの企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])
  })

  it.each(['before', 'after'] as const)(
    'clears the dirty state for a new text and checkbox answer with server props refreshed %s save completion',
    async (refreshTiming) => {
      const { wrapper, saveAnswer } = mountForm({
        form: createForm([
          createQuestion(),
          createQuestion({ id: toQuestionId('q-checkbox'), name: '備品', type: 'checkbox', options: ['机', '椅子'] })
        ])
      })
      const pendingSave = Promise.withResolvers<FormAnswer | null>()
      saveAnswer.mockReturnValueOnce(pendingSave.promise)
      const savedAnswer = createAnswer({ details: { 'q-text': ['新しい企画名'], 'q-checkbox': ['机', '椅子'] } })

      await wrapper.get('input[type="text"]').setValue('新しい企画名')
      const checkboxes = wrapper.findAll<HTMLInputElement>('input[type="checkbox"]')
      await checkboxes[0].setValue(true)
      await checkboxes[1].setValue(true)
      expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])

      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(saveAnswer).toHaveBeenCalledWith({ 'q-text': '新しい企画名', 'q-checkbox': ['机', '椅子'] })

      if (refreshTiming === 'after') {
        pendingSave.resolve(savedAnswer)
        await flushPromises()
        expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
      }

      await wrapper.setProps({ answer: savedAnswer })
      await wrapper.setProps({ answer: null })
      await wrapper.setProps({ answer: createAnswer({ details: savedAnswer.details }) })

      if (refreshTiming === 'before') {
        pendingSave.resolve(savedAnswer)
        await flushPromises()
      }

      expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('新しい企画名')
      expect(checkboxes.every((checkbox) => checkbox.element.checked)).toBe(true)
      expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
      expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)

      await checkboxes[1].setValue(false)
      expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])
      await checkboxes[1].setValue(true)
      expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
    }
  )

  it('retains edits and the dirty state after a failed save so it can be retried', async () => {
    const { wrapper, saveAnswer } = mountForm({ answer: createAnswer() })

    await wrapper.get('input[type="text"]').setValue('再送信する企画名')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.setProps({ errorMessage: '回答の保存に失敗しました。' })

    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('再送信する企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])
    expect(wrapper.text()).toContain('回答の保存に失敗しました。')
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(saveAnswer).toHaveBeenCalledTimes(2)
    expect(saveAnswer).toHaveBeenLastCalledWith({ 'q-text': '再送信する企画名' })
  })

  it('preserves unsaved text when an upload refreshes the same answer', async () => {
    const answer = createAnswer()
    const uploadQuestion = createQuestion({
      id: toQuestionId('q-upload'),
      name: '資料',
      type: 'upload',
      isRequired: false
    })
    const { wrapper } = mountForm({ form: createForm([createQuestion(), uploadQuestion]), answer })

    await wrapper.get('input[type="text"]').setValue('まだ保存していない企画名')
    const file = new File(['document'], 'layout.pdf', { type: 'application/pdf' })
    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [file] })
    await fileInput.trigger('change')
    expect(wrapper.emitted('fileChange')?.at(-1)).toEqual(['q-upload', file])

    await wrapper.setProps({ selectedFiles: { 'q-upload': file } })
    const uploadButton = wrapper.findAll('button').find((button) => button.text() === 'ファイルを追加')
    if (!uploadButton) {
      throw new Error('Upload button not found')
    }
    await uploadButton.trigger('click')
    expect(wrapper.emitted('upload')?.at(-1)).toEqual(['q-upload'])

    await wrapper.setProps({
      answer: createAnswer({
        updatedAt: '2026-03-02T01:00:00Z',
        uploads: [
          {
            id: toUploadId('upload-1'),
            questionId: uploadQuestion.id,
            filename: 'layout.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 8,
            createdAt: '2026-03-02T01:00:00Z'
          }
        ]
      }),
      selectedFiles: {}
    })

    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('まだ保存していない企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])
    expect(wrapper.text()).toContain('layout.pdf')
    expect(wrapper.get('a[href="/answers/answer-1/q-upload/download"]').text()).toContain('ダウンロード')
  })

  it('accepts refreshed values while the same answer has no unsaved edits', async () => {
    const { wrapper } = mountForm({ answer: createAnswer() })

    await wrapper.setProps({ answer: createAnswer({ details: { 'q-text': ['サーバーで更新された企画名'] } }) })
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('サーバーで更新された企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('resets unsaved values and validation errors when a different answer is selected', async () => {
    const { wrapper } = mountForm({ answer: createAnswer() })

    await wrapper.get('input[type="text"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('企画名を入力してください')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])

    await wrapper.setProps({
      answer: createAnswer({ id: toAnswerId('answer-2'), details: { 'q-text': ['別の回答の企画名'] } })
    })
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('別の回答の企画名')
    expect(wrapper.text()).not.toContain('企画名を入力してください')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('keeps changes made during a save and updates their baseline to the saved answer', async () => {
    const { wrapper, saveAnswer } = mountForm({ answer: createAnswer() })
    const pendingSave = Promise.withResolvers<FormAnswer | null>()
    saveAnswer.mockReturnValueOnce(pendingSave.promise)

    await wrapper.get('input[type="text"]').setValue('送信した企画名')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(saveAnswer).toHaveBeenCalledWith({ 'q-text': '送信した企画名' })
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)

    await wrapper.get('input[type="text"]').setValue('送信中に変更した企画名')
    pendingSave.resolve(createAnswer({ details: { 'q-text': ['送信した企画名'] } }))
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('送信中に変更した企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)

    await wrapper.get('input[type="text"]').setValue('送信した企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('keeps submission disabled while an upload refreshes the answer during a pending save', async () => {
    const { wrapper, saveAnswer } = mountForm({ answer: createAnswer() })
    const pendingSave = Promise.withResolvers<FormAnswer | null>()
    saveAnswer.mockReturnValueOnce(pendingSave.promise)

    await wrapper.get('input[type="text"]').setValue('送信した企画名')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)

    await wrapper.setProps({
      answer: createAnswer({
        uploads: [
          {
            id: toUploadId('upload-1'),
            questionId: toQuestionId('q-upload'),
            filename: 'layout.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 8,
            createdAt: '2026-03-02T01:00:00Z'
          }
        ]
      })
    })

    const disabledAfterRefresh = wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled
    pendingSave.resolve(createAnswer({ details: { 'q-text': ['送信した企画名'] } }))
    await flushPromises()

    expect(disabledAfterRefresh).toBe(true)
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)
    expect(saveAnswer).toHaveBeenCalledTimes(1)
  })

  it('ignores a late save result after switching to another answer', async () => {
    const { wrapper, saveAnswer } = mountForm({ answer: createAnswer() })
    const pendingSave = Promise.withResolvers<FormAnswer | null>()
    saveAnswer.mockReturnValueOnce(pendingSave.promise)

    await wrapper.get('input[type="text"]').setValue('最初の回答を送信')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(saveAnswer).toHaveBeenCalledWith({ 'q-text': '最初の回答を送信' })

    await wrapper.setProps({
      answer: createAnswer({ id: toAnswerId('answer-2'), details: { 'q-text': ['別の回答の企画名'] } })
    })
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
    const disabledAfterSwitch = wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled

    pendingSave.resolve(createAnswer({ details: { 'q-text': ['最初の回答を送信'] } }))
    await flushPromises()

    expect(disabledAfterSwitch).toBe(true)
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(false)
    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.value).toBe('別の回答の企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])

    await wrapper.get('input[type="text"]').setValue('別の回答を編集中')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([true])
    await wrapper.get('input[type="text"]').setValue('別の回答の企画名')
    expect(wrapper.emitted('update:dirty')?.at(-1)).toEqual([false])
  })

  it('preserves the legacy body for forms without questions', async () => {
    const { wrapper, saveAnswer } = mountForm({
      form: createForm([]),
      answer: createAnswer({ body: '以前の回答', details: {} })
    })

    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('以前の回答')
    await wrapper.get('textarea').setValue('更新した回答')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(saveAnswer).toHaveBeenCalledWith({ 'legacy-body': '更新した回答' })
  })

  it('does not submit a disabled form', async () => {
    const { wrapper, saveAnswer } = mountForm({ answer: createAnswer(), disabled: true })

    expect(wrapper.get<HTMLInputElement>('input[type="text"]').element.disabled).toBe(true)
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(saveAnswer).not.toHaveBeenCalled()
  })
})
