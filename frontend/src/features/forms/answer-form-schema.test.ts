import { describe, expect, it } from 'vitest'
import * as v from 'valibot'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer } from '@/features/forms/answers'
import { toAnswerId, toQuestionId } from '@/lib/api/schema'
import { buildFormAnswerSchema } from '@/lib/form-validation/schemas'
import {
  answerFormInputToDraft,
  buildAnswerFormInput,
  buildAnswerFormSchema,
  getAnswerFormElements
} from './answer-form-schema'

function textInput(value: string) {
  return { text: { 'question-1': value }, choices: {} }
}

function choiceInput(value: string[]) {
  return { text: {}, choices: { 'question-1': value } }
}

function createQuestion(overrides: Partial<FormQuestion> = {}): FormQuestion {
  return {
    id: toQuestionId('question-1'),
    name: '設問',
    description: '設問の説明',
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

function createAnswer(overrides: Partial<FormAnswer> = {}): FormAnswer {
  return {
    id: toAnswerId('answer-1'),
    body: '保存済みの回答',
    updatedAt: '2026-03-02T00:00:00Z',
    details: {},
    uploads: [],
    ...overrides
  }
}

describe('buildAnswerFormSchema', () => {
  it.each([
    { min: -2, max: 197, control: 'select' },
    { min: -2, max: 198, control: 'number' },
    { min: 3, max: 3, control: 'select' },
    { min: null, max: 3, control: 'number' },
    { min: 3, max: null, control: 'number' },
    { min: 3, max: 2, control: 'number' }
  ])('resolves numeric bounds $min–$max to a $control control', ({ min, max, control }) => {
    const schema = buildAnswerFormSchema([createQuestion({ type: 'number', numberMin: min, numberMax: max })])
    const element = getAnswerFormElements(schema)[0]

    expect(element.control).toBe(control)
    if (element.control === 'select') {
      expect(element.options[0]).toBe(String(min))
      expect(element.options.at(-1)).toBe(String(max))
      expect(element.options).toHaveLength((max ?? 0) - (min ?? 0) + 1)
    } else {
      expect(element).toMatchObject({ min, max })
    }
  })

  it.each([3, 300])('keeps number validation when the upper bound is %s', (max) => {
    const schema = buildAnswerFormSchema([createQuestion({ type: 'number', numberMin: 1, numberMax: max })])
    const messages = (value: string) => v.safeParse(schema, textInput(value)).issues?.map((issue) => issue.message)

    expect(v.safeParse(schema, textInput('1')).success).toBe(true)
    expect(v.safeParse(schema, textInput(String(max))).success).toBe(true)
    expect(messages('')).toEqual(['設問を入力してください'])
    expect(messages('abc')).toEqual(['数値を入力してください'])
    expect(messages('1.5')).toEqual(['整数を入力してください'])
    expect(messages('0')).toEqual(['1以上の値を入力してください'])
    expect(messages(String(max + 1))).toEqual([`${max}以下の値を入力してください`])
  })

  it.each(['text', 'textarea', 'markdown'] as const)('counts Unicode code points for %s validation', (type) => {
    const question = createQuestion({ type, numberMin: 2, numberMax: 3 })
    const requiredSchema = buildAnswerFormSchema([question])
    const optionalSchema = buildAnswerFormSchema([{ ...question, isRequired: false }])

    expect(v.safeParse(requiredSchema, textInput('😀あ')).success).toBe(true)
    expect(v.safeParse(requiredSchema, textInput('😀あ😀')).success).toBe(true)
    expect(v.safeParse(requiredSchema, textInput('😀')).issues?.[0].message).toBe('2文字以上で入力してください')
    expect(v.safeParse(requiredSchema, textInput('😀あ😀い')).issues?.[0].message).toBe('3文字以下で入力してください')
    expect(v.safeParse(requiredSchema, textInput('')).issues?.[0].message).toBe('設問を入力してください')
    expect(v.safeParse(optionalSchema, textInput('')).success).toBe(true)
  })

  it('keeps checkbox values as arrays and requires at least one value when required', () => {
    const question = createQuestion({ type: 'checkbox', options: ['机', '椅子'] })
    const requiredSchema = buildAnswerFormSchema([question])
    const optionalSchema = buildAnswerFormSchema([{ ...question, isRequired: false }])

    expect(getAnswerFormElements(requiredSchema)[0]).toMatchObject({ control: 'checkbox', required: true })
    expect(v.parse(requiredSchema, choiceInput(['机']))).toEqual(choiceInput(['机']))
    expect(v.safeParse(requiredSchema, choiceInput([])).issues?.[0].message).toBe('設問を選択してください')
    expect(v.safeParse(requiredSchema, { text: {}, choices: { 'question-1': '机' } }).success).toBe(false)
    expect(v.safeParse(optionalSchema, choiceInput([])).success).toBe(true)
  })

  it.each(['select', 'radio'] as const)(
    'preserves required validation without restricting %s values to options',
    (type) => {
      const schema = buildAnswerFormSchema([createQuestion({ type, options: ['現在の選択肢'] })])

      expect(v.safeParse(schema, textInput('')).issues?.[0].message).toBe('設問を入力してください')
      expect(v.safeParse(schema, textInput('以前の選択肢')).success).toBe(true)
    }
  )

  it('preserves presentation order while excluding headings and uploads from answer validation', () => {
    const schema = buildAnswerFormSchema([
      createQuestion({ id: toQuestionId('heading'), type: 'heading', priority: 5 }),
      createQuestion({ id: toQuestionId('text'), priority: 2 }),
      createQuestion({ id: toQuestionId('upload'), type: 'upload', allowedTypes: ' .PDF, JPG|.png\n WEBP\r\tgif ' })
    ])

    expect(getAnswerFormElements(schema).map((element) => element.id)).toEqual(['heading', 'text', 'upload'])
    expect(Object.keys(schema.entries.text.entries)).toEqual(['text'])
    expect(Object.keys(schema.entries.choices.entries)).toEqual([])
    expect(v.parse(schema, { text: { text: '回答', heading: '対象外', upload: '対象外' }, choices: {} })).toEqual({
      text: { text: '回答' },
      choices: {}
    })
    expect(getAnswerFormElements(schema)[2]).toEqual({
      id: 'upload',
      control: 'upload',
      label: '設問',
      description: '設問の説明',
      required: true,
      extensions: ['pdf', 'jpg', 'png', 'webp', 'gif'],
      maxSizeBytes: 5 * 1024 * 1024
    })
    expect(getAnswerFormElements(buildAnswerFormSchema([createQuestion({ type: 'upload' })]))[0]).toMatchObject({
      extensions: undefined
    })
  })

  it('adds a legacy body only when requested for a form without questions', () => {
    const emptySchema = buildAnswerFormSchema([])
    const legacySchema = buildAnswerFormSchema([], { legacyBody: true })
    const headingSchema = buildAnswerFormSchema([createQuestion({ type: 'heading' })], { legacyBody: true })

    expect(getAnswerFormElements(emptySchema)).toEqual([])
    expect(v.parse(emptySchema, { text: {}, choices: {} })).toEqual({ text: {}, choices: {} })
    expect(getAnswerFormElements(legacySchema)).toEqual([
      {
        id: 'legacy-body',
        control: 'textarea',
        label: '回答',
        description: '',
        required: false,
        placeholder: '回答内容を入力してください'
      }
    ])
    expect(v.parse(legacySchema, { text: { 'legacy-body': '' }, choices: {} })).toEqual({
      text: { 'legacy-body': '' },
      choices: {}
    })
    expect(v.safeParse(legacySchema, { text: { 'legacy-body': [] }, choices: {} }).success).toBe(false)
    expect(Object.keys(headingSchema.entries.text.entries)).toEqual([])
  })

  it('keeps additional answer keys for existing consumers of the compatibility schema', () => {
    const draft = { 'question-1': '回答', 'legacy-body': '本文', upload: '' }

    expect(v.parse(buildFormAnswerSchema([createQuestion()]), draft)).toEqual(draft)
    expect(v.parse(buildFormAnswerSchema([]), draft)).toEqual(draft)
  })
})

describe('buildAnswerFormInput', () => {
  it('initializes only schema fields, copies checkbox arrays, and takes the first scalar answer', () => {
    const schema = buildAnswerFormSchema([
      createQuestion({ id: toQuestionId('heading'), type: 'heading' }),
      createQuestion({ id: toQuestionId('upload'), type: 'upload' }),
      createQuestion({ id: toQuestionId('text') }),
      createQuestion({ id: toQuestionId('checkbox'), type: 'checkbox', options: ['机', '椅子'] }),
      createQuestion({ id: toQuestionId('number'), type: 'number', numberMin: 1, numberMax: 3 }),
      createQuestion({ id: toQuestionId('empty'), type: 'radio' })
    ])
    const answer = createAnswer({
      details: { text: ['先頭の回答', '後続の回答'], checkbox: ['机'], number: ['2'], removed: ['過去の設問'] }
    })
    const input = buildAnswerFormInput(schema, answer)

    expect(input).toEqual({ text: { text: '先頭の回答', number: '2', empty: '' }, choices: { checkbox: ['机'] } })
    expect(input.choices.checkbox).not.toBe(answer.details.checkbox)
    expect(buildAnswerFormInput(schema, null)).toEqual({
      text: { text: '', number: '', empty: '' },
      choices: { checkbox: [] }
    })
  })

  it('restores legacy body from the answer only when the schema includes it', () => {
    const answer = createAnswer({ details: { 'legacy-body': ['設問の回答'] } })

    expect(buildAnswerFormInput(buildAnswerFormSchema([], { legacyBody: true }), answer)).toEqual({
      text: { 'legacy-body': '保存済みの回答' },
      choices: {}
    })
    expect(buildAnswerFormInput(buildAnswerFormSchema([], { legacyBody: true }), null)).toEqual({
      text: { 'legacy-body': '' },
      choices: {}
    })
    expect(buildAnswerFormInput(buildAnswerFormSchema([]), answer)).toEqual({ text: {}, choices: {} })
  })
})

describe('answerFormInputToDraft', () => {
  it('flattens grouped values in question order, copies arrays, and excludes unknown keys', () => {
    const schema = buildAnswerFormSchema([
      createQuestion({ id: toQuestionId('checkbox'), type: 'checkbox' }),
      createQuestion({ id: toQuestionId('text') })
    ])
    const input = { text: { text: '回答', removed: '対象外' }, choices: { checkbox: ['机'] } }
    const draft = answerFormInputToDraft(schema, input)
    expect(draft).toEqual({ checkbox: ['机'], text: '回答' })
    expect(Object.keys(draft)).toEqual(['checkbox', 'text'])
    expect(draft.checkbox).not.toBe(input.choices.checkbox)
  })
})
