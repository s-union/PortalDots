import * as v from 'valibot'
import type { StaffFormQuestion } from '@/features/staff/forms/api'
import { normalizeOptions } from '@/lib/parseOptions'
import { fieldUi, formLayout, type LayoutItem } from '@/features/forms/schema-form'

const limitSchema = v.pipe(
  v.string(),
  v.transform((value) => (value.trim() === '' ? null : Number(value))),
  v.nullable(
    v.pipe(
      v.number('整数で入力してください'),
      v.integer('整数で入力してください'),
      v.minValue(-2147483648, '値が小さすぎます'),
      v.maxValue(2147483647, '値が大きすぎます')
    )
  )
)

/**
 * `question-${questionId}-${key}` DOM ids are a deviation from the default (field-key-derived)
 * `fieldUi.id`: the same schema shape is reused for every question card in a list, so each needs
 * its own ids to stay unique and to keep matching the pre-existing test/selector convention.
 */
function fieldId(questionId: string, key: string): string {
  return `question-${questionId}-${key}`
}

export function buildQuestionEditSchema(question: Pick<StaffFormQuestion, 'id' | 'type'>) {
  const { id: questionId, type } = question
  const limits = ['text', 'textarea', 'markdown', 'number', 'checkbox'].includes(type)
  const hasOptions = ['radio', 'select', 'checkbox'].includes(type)
  const numberMinLabel = type === 'number' ? '最低数' : type === 'checkbox' ? '最低選択数' : '最小文字数'
  const numberMaxLabel = type === 'number' ? '最大数' : type === 'checkbox' ? '最大選択数' : '最大文字数'

  const layout: LayoutItem[] = []
  if (type !== 'heading') layout.push('isRequired')
  layout.push('name', 'description')
  if (hasOptions) layout.push('options')
  if (limits) layout.push('numberMin', 'numberMax')
  if (type === 'upload') layout.push('allowedTypes')

  return v.pipe(
    v.object({
      name: v.pipe(
        v.string(),
        v.trim(),
        v.check((value) => type === 'heading' || value !== '', '設問名を入力してください'),
        fieldUi({
          control: 'text',
          label: type === 'heading' ? '見出し' : '設問名',
          id: fieldId(questionId, 'name'),
          inputClass:
            'w-full rounded border border-border bg-form-control px-3 py-2 text-body outline-none transition focus:border-primary focus:focus-ring-primary'
        })
      ),
      isRequired: v.pipe(
        v.boolean(),
        fieldUi({
          control: 'checkbox',
          label: '回答必須か',
          checkboxLabel: 'この設問への回答は必須',
          inputClass: 'gap-x-2',
          id: fieldId(questionId, 'isRequired')
        })
      ),
      description: v.pipe(
        v.string(),
        v.trim(),
        fieldUi({
          control: 'textarea',
          label: '説明',
          inputClass:
            'w-full rounded border border-border bg-form-control px-3 py-2 text-body outline-none transition focus:border-primary focus:focus-ring-primary min-h-24',
          id: fieldId(questionId, 'description')
        })
      ),
      numberMin: v.pipe(
        limitSchema,
        fieldUi({
          control: 'number',
          label: numberMinLabel,
          stringValue: true,
          id: fieldId(questionId, 'numberMin'),
          inputClass:
            'w-full rounded border border-border bg-form-control px-3 py-2 text-body outline-none transition focus:border-primary focus:focus-ring-primary'
        })
      ),
      numberMax: v.pipe(
        limitSchema,
        fieldUi({
          control: 'number',
          label: numberMaxLabel,
          stringValue: true,
          id: fieldId(questionId, 'numberMax'),
          inputClass:
            'w-full rounded border border-border bg-form-control px-3 py-2 text-body outline-none transition focus:border-primary focus:focus-ring-primary'
        })
      ),
      allowedTypes: v.pipe(
        v.string(),
        v.trim(),
        v.transform((value) => (type === 'upload' ? value : '')),
        fieldUi({
          control: 'text',
          label: '許可される拡張子',
          placeholder: '例: png|jpg|jpeg|gif',
          id: fieldId(questionId, 'allowedTypes'),
          inputClass:
            'w-full rounded border border-border bg-form-control px-3 py-2 text-body outline-none transition focus:border-primary focus:focus-ring-primary'
        })
      ),
      options: v.pipe(
        v.string(),
        v.transform(normalizeOptions),
        v.check((value) => !hasOptions || value.length > 0, '選択肢を 1 つ以上指定してください'),
        fieldUi({
          control: 'textarea',
          label: '選択肢',
          inputClass:
            'w-full rounded border border-border bg-form-control px-3 py-2 text-body outline-none transition focus:border-primary focus:focus-ring-primary min-h-24',
          placeholder: '1行に1つ選択肢を入力',
          helper: '改行区切りで選択肢を入力。',
          helperClass: 'mt-1',
          id: fieldId(questionId, 'options')
        })
      )
    }),
    v.forward(
      v.partialCheck(
        [['numberMin'], ['numberMax']],
        ({ numberMin, numberMax }) =>
          type !== 'number' || numberMin === null || numberMax === null || numberMin <= numberMax,
        '最大値は最小値以上にしてください'
      ),
      ['numberMax']
    ),
    formLayout(layout)
  )
}

export type QuestionEditSchema = ReturnType<typeof buildQuestionEditSchema>
export type QuestionEditInput = v.InferInput<QuestionEditSchema>

export function buildQuestionEditInput(question: StaffFormQuestion): QuestionEditInput {
  return {
    name: question.name,
    description: question.description,
    isRequired: question.isRequired,
    numberMin: question.numberMin === null ? '' : String(question.numberMin),
    numberMax: question.numberMax === null ? '' : String(question.numberMax),
    allowedTypes: question.allowedTypes,
    options: question.options.join('\n')
  }
}
