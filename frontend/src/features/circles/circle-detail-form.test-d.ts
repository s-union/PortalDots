import { expectTypeOf, it } from 'vitest'
import { setInput, type FieldStore, type FormStore } from '@formisch/vue'
import type { CircleDetailFormSchema } from './circle-detail-form'
import type SchemaAnswerFields from '@/components/forms/SchemaAnswerFields.vue'

declare const form: FormStore<CircleDetailFormSchema>
declare const name: FieldStore<CircleDetailFormSchema, ['basic', 'name']>
declare const choices: FieldStore<CircleDetailFormSchema, ['choices', string]>

it('checks fixed field names while retaining typed dynamic answer controls', () => {
  expectTypeOf(name.input).toEqualTypeOf<string | undefined>()
  expectTypeOf(choices.input).toEqualTypeOf<string[]>()
  expectTypeOf<typeof form>().toExtend<InstanceType<typeof SchemaAnswerFields>['$props']['form']>()
  setInput(form, { path: ['basic', 'name'], input: 'Circle name' })
  // @ts-expect-error Fixed field names must be checked.
  setInput(form, { path: ['basic', 'nameYomii'], input: 'reading' })
  // @ts-expect-error Basic text fields must not accept checkbox values.
  setInput(form, { path: ['basic', 'name'], input: ['option'] })
  // @ts-expect-error Checkbox answers must retain their array type in the combined form.
  setInput(form, { path: ['choices', 'question-id'], input: 'option' })
})
