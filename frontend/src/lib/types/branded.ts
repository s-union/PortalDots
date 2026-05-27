import * as z from 'zod'

export const userIdSchema = z.string().brand<'UserId'>()
export type UserId = z.infer<typeof userIdSchema>
export const toUserId = (value: string) => userIdSchema.parse(value)

export const circleIdSchema = z.string().brand<'CircleId'>()
export type CircleId = z.infer<typeof circleIdSchema>
export const toCircleId = (value: string) => circleIdSchema.parse(value)

export const formIdSchema = z.string().brand<'FormId'>()
export type FormId = z.infer<typeof formIdSchema>
export const toFormId = (value: string) => formIdSchema.parse(value)

export const questionIdSchema = z.string().brand<'QuestionId'>()
export type QuestionId = z.infer<typeof questionIdSchema>
export const toQuestionId = (value: string) => questionIdSchema.parse(value)

export const answerIdSchema = z.string().brand<'AnswerId'>()
export type AnswerId = z.infer<typeof answerIdSchema>
export const toAnswerId = (value: string) => answerIdSchema.parse(value)

export const uploadIdSchema = z.string().brand<'UploadId'>()
export type UploadId = z.infer<typeof uploadIdSchema>
export const toUploadId = (value: string) => uploadIdSchema.parse(value)

export const pageIdSchema = z.string().brand<'PageId'>()
export type PageId = z.infer<typeof pageIdSchema>
export const toPageId = (value: string) => pageIdSchema.parse(value)

export const documentIdSchema = z.string().brand<'DocumentId'>()
export type DocumentId = z.infer<typeof documentIdSchema>
export const toDocumentId = (value: string) => documentIdSchema.parse(value)

export const participationTypeIdSchema = z.string().brand<'ParticipationTypeId'>()
export type ParticipationTypeId = z.infer<typeof participationTypeIdSchema>
export const toParticipationTypeId = (value: string) => participationTypeIdSchema.parse(value)

export const categoryIdSchema = z.string().brand<'CategoryId'>()
export type CategoryId = z.infer<typeof categoryIdSchema>
export const toCategoryId = (value: string) => categoryIdSchema.parse(value)

export const tagIdSchema = z.string().brand<'TagId'>()
export type TagId = z.infer<typeof tagIdSchema>
export const toTagId = (value: string) => tagIdSchema.parse(value)

export const placeIdSchema = z.string().brand<'PlaceId'>()
export type PlaceId = z.infer<typeof placeIdSchema>
export const toPlaceId = (value: string) => placeIdSchema.parse(value)

export const jobIdSchema = z.string().brand<'JobId'>()
export type JobId = z.infer<typeof jobIdSchema>
export const toJobId = (value: string) => jobIdSchema.parse(value)

export const loginIdSchema = z.string().brand<'LoginId'>()
export type LoginId = z.infer<typeof loginIdSchema>
export const toLoginId = (value: string) => loginIdSchema.parse(value)

export const studentIdSchema = z.string().brand<'StudentId'>()
export type StudentId = z.infer<typeof studentIdSchema>
export const toStudentId = (value: string) => studentIdSchema.parse(value)

export const pendingRegistrationIdSchema = z.string().brand<'PendingRegistrationId'>()
export type PendingRegistrationId = z.infer<typeof pendingRegistrationIdSchema>
export const toPendingRegistrationId = (value: string) => pendingRegistrationIdSchema.parse(value)

export const invitationTokenSchema = z.string().brand<'InvitationToken'>()
export type InvitationToken = z.infer<typeof invitationTokenSchema>
export const toInvitationToken = (value: string) => invitationTokenSchema.parse(value)

export const csrfTokenSchema = z.string().brand<'CsrfToken'>()
export type CsrfToken = z.infer<typeof csrfTokenSchema>
export const toCsrfToken = (value: string) => csrfTokenSchema.parse(value)

export const activityLogIdSchema = z.string().brand<'ActivityLogId'>()
export type ActivityLogId = z.infer<typeof activityLogIdSchema>
export const toActivityLogId = (value: string) => activityLogIdSchema.parse(value)

export const contactSubmissionIdSchema = z.string().brand<'ContactSubmissionId'>()
export type ContactSubmissionId = z.infer<typeof contactSubmissionIdSchema>
export const toContactSubmissionId = (value: string) => contactSubmissionIdSchema.parse(value)
