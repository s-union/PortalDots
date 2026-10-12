import { expectTypeOf, it } from 'vitest'
import { setInput, type FieldStore, type FormStore } from '@formisch/vue'
import type { QuestionEditSchema } from './question-edit-schema'

declare const form: FormStore<QuestionEditSchema>
declare const name: FieldStore<QuestionEditSchema, ['name']>
declare const required: FieldStore<QuestionEditSchema, ['isRequired']>

it('keeps raw editing fields and required flags typed', () => {
  expectTypeOf(name.input).toEqualTypeOf<string | undefined>()
  expectTypeOf(required.input).toEqualTypeOf<boolean | undefined>()
  // @ts-expect-error Required flags cannot accept text input.
  setInput(form, { path: ['isRequired'], input: 'true' })
  // @ts-expect-error Numeric limits retain raw text until validation.
  setInput(form, { path: ['numberMin'], input: 1 })
  // @ts-expect-error Misspelled fields must be rejected.
  setInput(form, { path: ['numberMinimum'], input: '1' })
})
