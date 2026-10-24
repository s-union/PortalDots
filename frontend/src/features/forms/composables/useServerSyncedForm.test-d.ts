import { expectTypeOf, it } from 'vitest'
import { setInput, type FormStore } from '@formisch/vue'
import type { AnswerFormSchema } from '../answer-form-schema'
import type { QuestionEditSchema } from '@/features/staff/forms/editor/question-edit-schema'
import type { CircleDetailFormSchema } from '@/features/circles/circle-detail-form'
import { useServerSyncedForm, type SyncedFieldPath } from './useServerSyncedForm'

declare const question: ReturnType<typeof useServerSyncedForm<QuestionEditSchema>>['form']
declare const answer: ReturnType<typeof useServerSyncedForm<AnswerFormSchema>>['form']
declare const circle: ReturnType<typeof useServerSyncedForm<CircleDetailFormSchema>>['form']
declare const questionOptions: Parameters<typeof useServerSyncedForm<QuestionEditSchema>>[0]
declare const answerOptions: Parameters<typeof useServerSyncedForm<AnswerFormSchema>>[0]
declare const circleOptions: Parameters<typeof useServerSyncedForm<CircleDetailFormSchema>>[0]

it('retains the precise public schema while synchronization uses a shared field view', () => {
  expectTypeOf(question).toEqualTypeOf<FormStore<QuestionEditSchema>>()
  expectTypeOf(answer).toEqualTypeOf<FormStore<AnswerFormSchema>>()
  expectTypeOf(circle).toEqualTypeOf<FormStore<CircleDetailFormSchema>>()
  setInput(question, { path: ['isRequired'], input: true })
  setInput(answer, { path: ['choices', 'dynamic-id'], input: ['option'] })
  setInput(circle, { path: ['basic', 'name'], input: 'circle' })
  // @ts-expect-error Flat field names remain literal types.
  setInput(question, { path: ['numberMinimum'], input: '1' })
  // @ts-expect-error Boolean fields cannot accept strings.
  setInput(question, { path: ['isRequired'], input: 'true' })
  // @ts-expect-error Static answer group names remain literal types.
  setInput(answer, { path: ['txt', 'dynamic-id'], input: 'answer' })
  // @ts-expect-error Dynamic checkbox answers still require arrays.
  setInput(answer, { path: ['choices', 'dynamic-id'], input: 'option' })
  // @ts-expect-error Fixed fields remain checked inside mixed forms.
  setInput(circle, { path: ['basic', 'nameYomii'], input: 'reading' })
})

it('checks focus paths against the schema without widening schema inference', () => {
  expectTypeOf<SyncedFieldPath<AnswerFormSchema>>().toEqualTypeOf<
    readonly ['text', string] | readonly ['choices', string]
  >()
  useServerSyncedForm({ ...questionOptions, focusOrder: [['name'], ['isRequired']] })
  useServerSyncedForm({ ...answerOptions, focusOrder: [['text', 'dynamic-id']] })
  useServerSyncedForm({
    ...circleOptions,
    focusOrder: [
      ['basic', 'name'],
      ['choices', 'dynamic-id']
    ]
  })
  // @ts-expect-error A focus path must name an actual flat field.
  useServerSyncedForm({ ...questionOptions, focusOrder: [['numberMinimum']] })
  // @ts-expect-error Static group typos must not widen the inferred schema.
  useServerSyncedForm({ ...answerOptions, focusOrder: [['txt', 'dynamic-id']] })
  // @ts-expect-error Fixed group field names remain literal types.
  useServerSyncedForm({ ...circleOptions, focusOrder: [['basic', 'nameYomii']] })
})
