import * as v from 'valibot'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'

interface AnswerFormElementBase {
  id: string
  label: string
  description: string
  required: boolean
  placeholder?: string
}

export type AnswerFormElement = AnswerFormElementBase &
  (
    | { control: 'text' | 'textarea' | 'markdown' }
    | { control: 'number'; min: number | null; max: number | null }
    | { control: 'select' | 'radio' | 'checkbox'; options: string[] }
    | { control: 'upload'; extensions: string[] | undefined; maxSizeBytes: number }
    | { control: 'heading' }
  )

const MAX_NUMBER_SELECT_OPTIONS = 200
// Mirrors backend/internal/controllers/form_answer_context.go's maxAnswerUploadBytes.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function buildAnswerFormSchema(questions: FormQuestion[], options: { legacyBody?: boolean } = {}) {
  const entries: Record<string, v.GenericSchema<string | string[]>> = {}
  const elements: AnswerFormElement[] = []

  for (const question of questions) {
    const element = {
      id: question.id,
      label: question.name,
      description: question.description,
      required: question.isRequired
    }
    const { numberMin: min, numberMax: max } = question

    switch (question.type) {
      case 'heading':
        elements.push({ ...element, control: 'heading' })
        break
      case 'upload': {
        // Mirrors backend/internal/domain/formquestion/validation.go's NormalizeAllowedTypes.
        const extensions = question.allowedTypes
          .split(/[,|\n\r \t]+/)
          .map((part) => part.trim().toLowerCase().replace(/^\./, ''))
          .filter((part) => part !== '')
        elements.push({
          ...element,
          control: 'upload',
          extensions: extensions.length > 0 ? extensions : undefined,
          maxSizeBytes: MAX_UPLOAD_BYTES
        })
        break
      }
      case 'number':
        elements.push(
          min !== null && max !== null && min <= max && max - min + 1 <= MAX_NUMBER_SELECT_OPTIONS
            ? {
                ...element,
                control: 'select',
                options: Array.from({ length: max - min + 1 }, (_, index) => String(min + index))
              }
            : { ...element, control: 'number', min, max }
        )
        entries[element.id] = v.pipe(
          v.string(),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const value = dataset.value
            if (value === '' && !element.required) return
            if (value === '') {
              addIssue({ message: `${element.label}を入力してください` })
              return
            }
            const number = Number(value)
            if (isNaN(number)) {
              addIssue({ message: '数値を入力してください' })
              return
            }
            if (!Number.isInteger(number)) {
              addIssue({ message: '整数を入力してください' })
              return
            }
            if (min !== null && number < min) {
              addIssue({ message: `${min}以上の値を入力してください` })
            }
            if (max !== null && number > max) {
              addIssue({ message: `${max}以下の値を入力してください` })
            }
          })
        )
        break
      case 'checkbox':
        elements.push({ ...element, control: 'checkbox', options: [...question.options] })
        entries[element.id] = element.required
          ? v.pipe(v.array(v.string()), v.minLength(1, `${element.label}を選択してください`))
          : v.array(v.string())
        break
      case 'text':
      case 'textarea':
      case 'markdown':
        elements.push({ ...element, control: question.type })
        entries[element.id] = v.pipe(
          v.string(),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const value = dataset.value
            if (value === '' && !element.required) return
            if (value === '') {
              addIssue({ message: `${element.label}を入力してください` })
              return
            }
            const length = Array.from(value).length
            if (min !== null && length < min) {
              addIssue({ message: `${min}文字以上で入力してください` })
            }
            if (max !== null && length > max) {
              addIssue({ message: `${max}文字以下で入力してください` })
            }
          })
        )
        break
      case 'select':
      case 'radio':
        elements.push({ ...element, control: question.type, options: [...question.options] })
        entries[element.id] = element.required
          ? v.pipe(v.string(), v.minLength(1, `${element.label}を入力してください`))
          : v.string()
        break
      default:
        throw new Error(`Unsupported question type: ${String(question.type satisfies never)}`)
    }
  }

  if (options.legacyBody && questions.length === 0) {
    entries['legacy-body'] = v.string()
    elements.push({
      id: 'legacy-body',
      control: 'textarea',
      label: '回答',
      description: '',
      required: false,
      placeholder: '回答内容を入力してください'
    })
  }

  return v.pipe(v.object(entries), v.metadata({ elements }))
}

export type AnswerFormSchema = ReturnType<typeof buildAnswerFormSchema>

export function getAnswerFormElements(schema: AnswerFormSchema): AnswerFormElement[] {
  return v.getMetadata(schema).elements
}

export function buildAnswerFormInput(schema: AnswerFormSchema, answer: FormAnswer | null): FormAnswerDraft {
  const input: FormAnswerDraft = {}
  for (const element of getAnswerFormElements(schema)) {
    if (element.control === 'heading' || element.control === 'upload') continue
    if (element.id === 'legacy-body') {
      input[element.id] = answer?.body ?? ''
      continue
    }
    const values = answer?.details[element.id] ?? []
    input[element.id] = element.control === 'checkbox' ? [...values] : (values[0] ?? '')
  }
  return input
}
