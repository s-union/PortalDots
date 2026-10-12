import * as v from 'valibot'
import type { CircleDetail } from './api'
import { circleRegistrationFormSchema } from '@/lib/form-validation'
import { buildAnswerFormInput, type AnswerFormSchema } from '@/features/forms/answer-form-schema'
import { fieldUi, getFieldUi } from '@/features/forms/schema-form'

export const circleBasicInfoSchema = v.omit(circleRegistrationFormSchema, ['participationTypeId'])
export type CircleBasicInfoFormSchema = v.GenericSchema<{ basic: v.InferInput<typeof circleBasicInfoSchema> }>

/**
 * `groupName`/`groupNameYomi` relaxed to a plain `v.string()` (no length requirement), for the
 * *validation* schema only, when the group name is inherited from an existing circle and locked
 * (`canChangeGroupName: false`): the field stays disabled and reset to the server value (see
 * `CircleBasicInfoFields.vue`'s reset watch), so it must never fail validation on submit.
 * `fieldUi()` metadata is carried over unchanged so the rendered field (label/placeholder/id) is
 * unaffected — `CircleBasicInfoFields.vue` itself always renders from `circleBasicInfoSchema`,
 * since this relaxation only matters for the schema actually used to validate submission.
 */
export function lockedGroupNameEntries() {
  return {
    groupName: v.pipe(v.string(), fieldUi(getFieldUi(circleBasicInfoSchema.entries.groupName))),
    groupNameYomi: v.pipe(v.string(), fieldUi(getFieldUi(circleBasicInfoSchema.entries.groupNameYomi)))
  }
}

export function buildCircleDetailFormSchema(answers: AnswerFormSchema, canChangeGroupName = true) {
  const basic = canChangeGroupName
    ? circleBasicInfoSchema
    : v.object({ ...circleBasicInfoSchema.entries, ...lockedGroupNameEntries() })
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
