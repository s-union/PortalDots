import { expectTypeOf, it } from 'vitest'
import type { FieldStore, FormStore } from '@formisch/vue'
import { setInput } from '@formisch/vue'
import type { AnswerFormSchema } from './answer-form-schema'
import type CheckboxAnswerControl from '@/components/forms/CheckboxAnswerControl.vue'
import type TextAnswerControl from '@/components/forms/TextAnswerControl.vue'

declare const text: FieldStore<AnswerFormSchema, ['text', string]>
declare const choices: FieldStore<AnswerFormSchema, ['choices', string]>
declare const form: FormStore<AnswerFormSchema>

it('keeps dynamically keyed fields and their controls typed by value kind', () => {
  expectTypeOf(text.input).toEqualTypeOf<string | undefined>()
  expectTypeOf(choices.input).toEqualTypeOf<string[]>()
  expectTypeOf<InstanceType<typeof TextAnswerControl>['$props']['modelValue']>().toEqualTypeOf<string | undefined>()
  expectTypeOf<InstanceType<typeof CheckboxAnswerControl>['$props']['modelValue']>().toEqualTypeOf<string[]>()
  // @ts-expect-error Text fields must not accept checkbox arrays.
  text.input = ['option']
  // @ts-expect-error Checkbox fields must not accept scalar answers.
  choices.input = 'option'
  // @ts-expect-error Static group names must be checked even though question IDs are dynamic.
  setInput(form, { path: ['txt', 'question-id'], input: 'answer' })
})
