import * as v from 'valibot'
import type { CircleDetail } from './api'
import { circleRegistrationFormSchema } from '@/lib/form-validation'
import { buildAnswerFormInput, type AnswerFormSchema } from '@/features/forms/answer-form-schema'

export const circleBasicInfoSchema = v.omit(circleRegistrationFormSchema, ['participationTypeId'])
export type CircleBasicInfoFormSchema = v.GenericSchema<{ basic: v.InferInput<typeof circleBasicInfoSchema> }>

export function buildCircleDetailFormSchema(answers: AnswerFormSchema, canChangeGroupName = true) {
  const basic = canChangeGroupName
    ? circleBasicInfoSchema
    : v.object({ ...circleBasicInfoSchema.entries, groupName: v.string(), groupNameYomi: v.string() })
  return v.pipe(v.object({ basic, ...answers.entries }), v.metadata({ answers }))
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
      notes: detail.notes
    },
    ...buildAnswerFormInput(answers, detail.answer)
  }
}
