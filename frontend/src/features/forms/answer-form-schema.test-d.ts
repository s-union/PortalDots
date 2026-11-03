import { expectTypeOf, it } from 'vitest'
import type { FieldStore, FormStore } from '@formisch/vue'
import { setInput } from '@formisch/vue'
import type { AnswerFormSchema } from './answer-form-schema'
import type { FieldKey, FieldOverrides } from './schema-form'

declare const text: FieldStore<AnswerFormSchema, ['text', string]>
declare const choices: FieldStore<AnswerFormSchema, ['choices', string]>
declare const form: FormStore<AnswerFormSchema>

it('keeps dynamically keyed fields typed by value kind', () => {
  expectTypeOf(text.input).toEqualTypeOf<string | undefined>()
  expectTypeOf(choices.input).toEqualTypeOf<string[]>()
  // @ts-expect-error Text fields must not accept checkbox arrays.
  text.input = ['option']
  // @ts-expect-error Checkbox fields must not accept scalar answers.
  choices.input = 'option'
  // @ts-expect-error Static group names must be checked even though question IDs are dynamic.
  setInput(form, { path: ['txt', 'question-id'], input: 'answer' })
})

it('accepts dynamic question ids under the text/choices record groups as SchemaFormFields field keys', () => {
  expectTypeOf<`text.${string}`>().toMatchTypeOf<FieldKey<AnswerFormSchema['entries']>>()
  expectTypeOf<`choices.${string}`>().toMatchTypeOf<FieldKey<AnswerFormSchema['entries']>>()
  const overrides: FieldOverrides<AnswerFormSchema['entries']> = {
    'text.any-question-id': { helper: 'dynamic key, not a literal from the schema' },
    'choices.any-question-id': { loading: true }
  }
  expectTypeOf(overrides).toMatchTypeOf<FieldOverrides<AnswerFormSchema['entries']>>()
})
