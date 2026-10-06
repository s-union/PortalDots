import * as v from 'valibot'
import type { CircleDetail } from './api'
import { circleRegistrationFormSchema } from '@/lib/form-validation'
import { buildAnswerFormInput, type AnswerFormSchema } from '@/features/forms/answer-form-schema'

export function buildCircleDetailFormSchema(answers: AnswerFormSchema) {
  return v.pipe(v.object({ basic: circleRegistrationFormSchema, ...answers.entries }), v.metadata({ answers }))
}
export type CircleDetailFormSchema = ReturnType<typeof buildCircleDetailFormSchema>
export type CircleDetailFormOutput = v.InferOutput<CircleDetailFormSchema>

export function buildCircleDetailFormInput(
  detail: CircleDetail,
  answers: AnswerFormSchema
): v.InferInput<CircleDetailFormSchema> {
  return {
    basic: {
      name: detail.name,
      nameYomi: detail.nameYomi,
      groupName: detail.groupName,
      groupNameYomi: detail.groupNameYomi,
      participationTypeId: detail.participationTypeId,
      notes: detail.notes
    },
    ...buildAnswerFormInput(answers, detail.answer)
  }
}
