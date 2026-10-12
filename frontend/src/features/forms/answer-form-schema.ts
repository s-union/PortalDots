import * as v from 'valibot'
import type { FormQuestion } from '@/features/forms/api'
import type { FormAnswer, FormAnswerDraft } from '@/features/forms/answers'
import type { SyncedFieldPath } from './composables/server-synced-form-fields'
import { fieldUi, formLayout, resolveLayout, type FieldOption, type LayoutItem } from './schema-form'

/** A question's upload control. Uploads are separate API operations, not Formisch fields — they
 * render through `SchemaAnswerFields.vue`'s `slot:upload:<id>` layout item instead of a schema entry. */
export interface UploadAnswerElement {
  id: string
  label: string
  description: string
  required: boolean
  extensions: string[] | undefined
  maxSizeBytes: number
}

const MAX_NUMBER_SELECT_OPTIONS = 200
// Mirrors backend/internal/controllers/form_answer_context.go's maxAnswerUploadBytes.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function toOptions(values: readonly string[]): readonly FieldOption[] {
  return values.map((value) => ({ value, label: value }))
}

export function buildAnswerFormSchema(questions: FormQuestion[], options: { legacyBody?: boolean } = {}) {
  const textEntries: Record<string, v.GenericSchema<string>> = {}
  const choiceEntries: Record<string, v.GenericSchema<string[]>> = {}
  const layout: LayoutItem[] = []
  const uploads: UploadAnswerElement[] = []

  for (const question of questions) {
    const { id, name: label, description, isRequired: required } = question
    const { numberMin: min, numberMax: max } = question
    const helper = description || undefined

    switch (question.type) {
      case 'heading':
        layout.push({ heading: label, description })
        break
      case 'upload': {
        // Mirrors backend/internal/domain/formquestion/validation.go's NormalizeAllowedTypes.
        const extensions = question.allowedTypes
          .split(/[,|\n\r \t]+/)
          .map((part) => part.trim().toLowerCase().replace(/^\./, ''))
          .filter((part) => part !== '')
        uploads.push({
          id,
          label,
          description,
          required,
          extensions: extensions.length > 0 ? extensions : undefined,
          maxSizeBytes: MAX_UPLOAD_BYTES
        })
        layout.push({ slot: `upload:${id}` })
        break
      }
      case 'number': {
        const bounded = min !== null && max !== null && min <= max && max - min + 1 <= MAX_NUMBER_SELECT_OPTIONS
        textEntries[id] = v.pipe(
          v.string(),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const value = dataset.value.trim()
            if (value === '' && !required) return
            if (value === '') {
              addIssue({ message: `${label}を入力してください` })
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
          }),
          bounded
            ? fieldUi({
                control: 'select',
                label,
                helper,
                id,
                name: id,
                required,
                keepUnavailableValue: true,
                options: toOptions(Array.from({ length: max - min + 1 }, (_, index) => String(min + index)))
              })
            : fieldUi({
                control: 'number',
                label,
                helper,
                id,
                name: id,
                required,
                min: min ?? undefined,
                max: max ?? undefined,
                // Numeric answers are stored and re-validated as strings (see the rawCheck above);
                // native `v-model.number` coercion would turn a partial "1.5" into a JS number,
                // which fails the `v.string()` base check before the custom message ever runs.
                stringValue: true
              })
        )
        layout.push(`text.${id}`)
        break
      }
      case 'checkbox':
        choiceEntries[id] = v.pipe(
          v.array(v.string()),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const values = dataset.value.map((value) => value.trim()).filter((value) => value !== '')
            if (required && values.length === 0) {
              addIssue({ message: `${label}を選択してください` })
            }
            if (question.options.length && values.some((value) => !question.options.includes(value))) {
              addIssue({ message: '選択肢が変更されています。現在の選択肢から選び直してください' })
            }
          }),
          fieldUi({
            control: 'checkboxGroup',
            label,
            helper,
            id,
            name: id,
            required,
            keepUnavailableValue: true,
            options: toOptions(question.options)
          })
        )
        layout.push(`choices.${id}`)
        break
      case 'text':
      case 'textarea':
      case 'markdown':
        textEntries[id] = v.pipe(
          v.string(),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const value = dataset.value.trim()
            if (value === '' && !required) return
            if (value === '') {
              addIssue({ message: `${label}を入力してください` })
              return
            }
            const length = Array.from(value).length
            if (min !== null && length < min) {
              addIssue({ message: `${min}文字以上で入力してください` })
            }
            if (max !== null && length > max) {
              addIssue({ message: `${max}文字以下で入力してください` })
            }
          }),
          fieldUi({ control: question.type, label, helper, id, name: id, required })
        )
        layout.push(`text.${id}`)
        break
      case 'select':
      case 'radio':
        textEntries[id] = v.pipe(
          v.string(),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const value = dataset.value.trim()
            if (value === '') {
              if (required) addIssue({ message: `${label}を入力してください` })
              return
            }
            if (question.options.length && !question.options.includes(value)) {
              addIssue({ message: '選択肢が変更されています。現在の選択肢から選び直してください' })
            }
          }),
          fieldUi({
            control: question.type,
            label,
            helper,
            id,
            name: id,
            required,
            keepUnavailableValue: true,
            options: toOptions(question.options)
          })
        )
        layout.push(`text.${id}`)
        break
      default:
        throw new Error(`Unsupported question type: ${String(question.type satisfies never)}`)
    }
  }

  if (options.legacyBody && questions.length === 0) {
    textEntries['legacy-body'] = v.pipe(
      v.string(),
      fieldUi({
        control: 'textarea',
        label: '回答',
        id: 'legacy-body',
        // Rendered name differs from the field key (e2e tests and the staff/workspace answer
        // pages target `textarea[name="answer-body"]`; the key stays 'legacy-body' to match the
        // draft/input structure used throughout this module).
        name: 'answer-body',
        required: false,
        placeholder: '回答内容を入力してください'
      })
    )
    layout.push('text.legacy-body')
  }

  return v.pipe(
    v.object({ text: v.object(textEntries), choices: v.object(choiceEntries) }),
    formLayout(layout),
    // Called directly (not through `fieldUi()`/`formLayout()`) so `v.pipe(...)`'s own context
    // infers `TInput`; see `fieldUi()` in `./schema-form/ui.ts` for why an explicit `TInput` here
    // (e.g. hardcoding `never`) would collapse this schema's `InferOutput` instead.
    v.metadata({ uploads })
  )
}

export type AnswerFormSchema = ReturnType<typeof buildAnswerFormSchema>
export type AnswerFormInput = v.InferInput<AnswerFormSchema>
export type AnswerFieldsSchema = v.GenericSchema<AnswerFormInput>

/** The answer's upload questions, in question order. */
export function getUploadAnswerElements(schema: AnswerFormSchema): UploadAnswerElement[] {
  return (v.getMetadata(schema).uploads as UploadAnswerElement[] | undefined) ?? []
}

/** The schema's `text.<id>`/`choices.<id>` field paths, in question order (excludes headings/uploads). */
export function answerFormFieldPaths(schema: AnswerFormSchema): SyncedFieldPath<AnswerFormSchema>[] {
  return resolveLayout(schema).flatMap((item) => {
    if (typeof item !== 'string') return []
    const [group, id] = item.split('.', 2)
    return (group === 'text' || group === 'choices') && id !== undefined
      ? [[group, id] as SyncedFieldPath<AnswerFormSchema>]
      : []
  })
}

export function buildAnswerFormInput(schema: AnswerFormSchema, answer: FormAnswer | null): AnswerFormInput {
  const input: AnswerFormInput = { text: {}, choices: {} }
  for (const [group, id] of answerFormFieldPaths(schema)) {
    if (id === 'legacy-body') {
      input.text[id] = answer?.body ?? ''
      continue
    }
    const values = answer?.details[id] ?? []
    if (group === 'choices') {
      input.choices[id] = [...values]
    } else {
      input.text[id] = values[0] ?? ''
    }
  }
  return input
}

export function answerFormInputToDraft(
  schema: AnswerFormSchema,
  input: { text: Record<string, string | undefined>; choices: Record<string, string[]> }
): FormAnswerDraft {
  const draft: FormAnswerDraft = {}
  // Preserve question order for the legacy body summary as well as the details payload.
  for (const [group, id] of answerFormFieldPaths(schema)) {
    draft[id] = group === 'choices' ? [...(input.choices[id] ?? [])] : (input.text[id] ?? '')
  }
  return draft
}

export function answerFormStructureKey(schema: AnswerFormSchema): string {
  return JSON.stringify([
    Object.keys(schema.entries.text.entries).sort(),
    Object.keys(schema.entries.choices.entries).sort()
  ])
}
