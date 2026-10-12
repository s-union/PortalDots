import { it, expectTypeOf } from 'vitest'
import { setInput, type FormStore, type RequiredPath } from '@formisch/vue'
import { staffFormSchema } from '@/lib/form-validation'
import { useSubmitForm } from '@/features/forms/composables/useSubmitForm'
import { createDefaultStaffFormPayload } from '@/features/staff/forms/utils'
import FormischField from './FormischField.vue'

declare const session: ReturnType<typeof useSubmitForm<typeof staffFormSchema>>
type FieldProps<TPath extends RequiredPath> = Parameters<typeof FormischField<typeof staffFormSchema, TPath>>[0]

it('keeps fixed paths, numeric values, and array values checked through the shared field', () => {
  expectTypeOf(session.form).toEqualTypeOf<FormStore<typeof staffFormSchema>>()
  void ({ of: session.form, path: ['name'], label: 'Name' } satisfies FieldProps<['name']>)
  void ({ of: session.form, path: ['maxAnswers'], label: 'Count' } satisfies FieldProps<['maxAnswers']>)
  setInput(session.form, { path: ['maxAnswers'], input: 2 })
  setInput(session.form, { path: ['answerableTags'], input: ['tag'] })
  // @ts-expect-error A path typo must not widen schema inference.
  void ({ of: session.form, path: ['maxAnswerss'], label: 'Count' } satisfies FieldProps<['maxAnswerss']>)
  // @ts-expect-error Numeric fields retain their input types.
  setInput(session.form, { path: ['maxAnswers'], input: '2' })
  // @ts-expect-error Selection arrays cannot be scalar strings.
  setInput(session.form, { path: ['answerableTags'], input: 'tag' })
  useSubmitForm({
    schema: staffFormSchema,
    initialInput: createDefaultStaffFormPayload(),
    submit: async (output) => {
      expectTypeOf(output.maxAnswers).toEqualTypeOf<number>()
      expectTypeOf(output.answerableTags).toEqualTypeOf<string[]>()
      // @ts-expect-error Submission output does not lose the numeric schema type.
      output.maxAnswers = '2'
    }
  })
})
