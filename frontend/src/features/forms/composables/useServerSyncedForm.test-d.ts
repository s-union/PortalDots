import { expectTypeOf, it } from 'vitest'
import { setInput, type FormStore } from '@formisch/vue'
import type { AnswerFormSchema } from '../answer-form-schema'
import type { QuestionEditSchema } from '@/features/staff/forms/editor/question-edit-schema'
import type { CircleDetailFormSchema } from '@/features/circles/circle-detail-form'
import { useServerSyncedForm } from './useServerSyncedForm'

declare const question: ReturnType<typeof useServerSyncedForm<QuestionEditSchema>>['form']
declare const answer: ReturnType<typeof useServerSyncedForm<AnswerFormSchema>>['form']
declare const circle: ReturnType<typeof useServerSyncedForm<CircleDetailFormSchema>>['form']

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
