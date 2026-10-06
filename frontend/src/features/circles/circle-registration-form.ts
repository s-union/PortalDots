import * as v from 'valibot'
import { circleRegistrationFormSchema } from '@/lib/form-validation'
import { buildAnswerFormInput, type AnswerFormSchema } from '@/features/forms/answer-form-schema'
import type { CircleDetail } from './api'

export function buildCircleRegistrationFormSchema(answers: AnswerFormSchema) {
  return v.pipe(v.object({ basic: circleRegistrationFormSchema, ...answers.entries }), v.metadata({ answers }))
}
export type CircleRegistrationFormSchema = ReturnType<typeof buildCircleRegistrationFormSchema>
export type CircleRegistrationFormOutput = v.InferOutput<CircleRegistrationFormSchema>

export function buildCircleRegistrationFormInput(
  registration: CircleDetail | null,
  answers: AnswerFormSchema,
  defaultParticipationTypeId: string
): v.InferInput<CircleRegistrationFormSchema> {
  return {
    basic: {
      name: '',
      nameYomi: '',
      groupName: registration?.groupName ?? '',
      groupNameYomi: registration?.groupNameYomi ?? '',
      participationTypeId: defaultParticipationTypeId,
      notes: ''
    },
    ...buildAnswerFormInput(answers, null)
  }
}
