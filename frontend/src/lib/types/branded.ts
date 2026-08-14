import * as v from 'valibot'

export const userIdSchema = v.pipe(v.string(), v.brand('UserId'))
export type UserId = v.InferOutput<typeof userIdSchema>
export const toUserId = (value: string) => v.parse(userIdSchema, value)

export const circleIdSchema = v.pipe(v.string(), v.brand('CircleId'))
export type CircleId = v.InferOutput<typeof circleIdSchema>
export const toCircleId = (value: string) => v.parse(circleIdSchema, value)

export const formIdSchema = v.pipe(v.string(), v.brand('FormId'))
export type FormId = v.InferOutput<typeof formIdSchema>
export const toFormId = (value: string) => v.parse(formIdSchema, value)

export const questionIdSchema = v.pipe(v.string(), v.brand('QuestionId'))
export type QuestionId = v.InferOutput<typeof questionIdSchema>
export const toQuestionId = (value: string) => v.parse(questionIdSchema, value)

export const answerIdSchema = v.pipe(v.string(), v.brand('AnswerId'))
export type AnswerId = v.InferOutput<typeof answerIdSchema>
export const toAnswerId = (value: string) => v.parse(answerIdSchema, value)

export const uploadIdSchema = v.pipe(v.string(), v.brand('UploadId'))
export type UploadId = v.InferOutput<typeof uploadIdSchema>
export const toUploadId = (value: string) => v.parse(uploadIdSchema, value)

export const pageIdSchema = v.pipe(v.string(), v.brand('PageId'))
export type PageId = v.InferOutput<typeof pageIdSchema>
export const toPageId = (value: string) => v.parse(pageIdSchema, value)

export const documentIdSchema = v.pipe(v.string(), v.brand('DocumentId'))
export type DocumentId = v.InferOutput<typeof documentIdSchema>
export const toDocumentId = (value: string) => v.parse(documentIdSchema, value)

export const participationTypeIdSchema = v.pipe(v.string(), v.brand('ParticipationTypeId'))
export type ParticipationTypeId = v.InferOutput<typeof participationTypeIdSchema>
export const toParticipationTypeId = (value: string) => v.parse(participationTypeIdSchema, value)

export const categoryIdSchema = v.pipe(v.string(), v.brand('CategoryId'))
export type CategoryId = v.InferOutput<typeof categoryIdSchema>
export const toCategoryId = (value: string) => v.parse(categoryIdSchema, value)

export const tagIdSchema = v.pipe(v.string(), v.brand('TagId'))
export type TagId = v.InferOutput<typeof tagIdSchema>
export const toTagId = (value: string) => v.parse(tagIdSchema, value)

export const placeIdSchema = v.pipe(v.string(), v.brand('PlaceId'))
export type PlaceId = v.InferOutput<typeof placeIdSchema>
export const toPlaceId = (value: string) => v.parse(placeIdSchema, value)

export const jobIdSchema = v.pipe(v.string(), v.brand('JobId'))
export type JobId = v.InferOutput<typeof jobIdSchema>
export const toJobId = (value: string) => v.parse(jobIdSchema, value)

export const loginIdSchema = v.pipe(v.string(), v.brand('LoginId'))
export type LoginId = v.InferOutput<typeof loginIdSchema>
export const toLoginId = (value: string) => v.parse(loginIdSchema, value)

export const studentIdSchema = v.pipe(v.string(), v.brand('StudentId'))
export type StudentId = v.InferOutput<typeof studentIdSchema>
export const toStudentId = (value: string) => v.parse(studentIdSchema, value)

export const pendingRegistrationIdSchema = v.pipe(v.string(), v.brand('PendingRegistrationId'))
export type PendingRegistrationId = v.InferOutput<typeof pendingRegistrationIdSchema>
export const toPendingRegistrationId = (value: string) => v.parse(pendingRegistrationIdSchema, value)

export const invitationTokenSchema = v.pipe(v.string(), v.brand('InvitationToken'))
export type InvitationToken = v.InferOutput<typeof invitationTokenSchema>
export const toInvitationToken = (value: string) => v.parse(invitationTokenSchema, value)

export const csrfTokenSchema = v.pipe(v.string(), v.brand('CsrfToken'))
export type CsrfToken = v.InferOutput<typeof csrfTokenSchema>
export const toCsrfToken = (value: string) => v.parse(csrfTokenSchema, value)

export const activityLogIdSchema = v.pipe(v.string(), v.brand('ActivityLogId'))
export type ActivityLogId = v.InferOutput<typeof activityLogIdSchema>
export const toActivityLogId = (value: string) => v.parse(activityLogIdSchema, value)

export const contactSubmissionIdSchema = v.pipe(v.string(), v.brand('ContactSubmissionId'))
export type ContactSubmissionId = v.InferOutput<typeof contactSubmissionIdSchema>
export const toContactSubmissionId = (value: string) => v.parse(contactSubmissionIdSchema, value)
