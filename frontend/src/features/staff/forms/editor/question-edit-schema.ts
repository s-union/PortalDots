import * as v from 'valibot'
import type { StaffFormQuestion } from '@/features/staff/forms/api'
import { normalizeOptions } from '@/lib/parseOptions'

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

export function buildQuestionEditSchema(type: StaffFormQuestion['type']) {
  return v.pipe(
    v.object({
      name: v.pipe(
        v.string(),
        v.trim(),
        v.check((value) => type === 'heading' || value !== '', '設問名を入力してください')
      ),
      description: v.pipe(v.string(), v.trim()),
      isRequired: v.boolean(),
      numberMin: limitSchema,
      numberMax: limitSchema,
      allowedTypes: v.pipe(
        v.string(),
        v.trim(),
        v.transform((value) => (type === 'upload' ? value : ''))
      ),
      options: v.pipe(
        v.string(),
        v.transform(normalizeOptions),
        v.check(
          (value) => !['radio', 'select', 'checkbox'].includes(type) || value.length > 0,
          '選択肢を 1 つ以上指定してください'
        )
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
    )
  )
}

export type QuestionEditSchema = ReturnType<typeof buildQuestionEditSchema>
export type QuestionEditInput = v.InferInput<QuestionEditSchema>
export type StringQuestionField = Exclude<keyof QuestionEditInput, 'isRequired'>

export const questionEditFields = [
  'name',
  'description',
  'isRequired',
  'numberMin',
  'numberMax',
  'allowedTypes',
  'options'
] as const satisfies readonly (keyof QuestionEditInput)[]

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
