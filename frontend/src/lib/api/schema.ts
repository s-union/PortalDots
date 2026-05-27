import * as z from 'zod'
import type { FormId, StudentId, CircleId } from '@/lib/types/branded'
import {
  userIdSchema,
  circleIdSchema,
  formIdSchema,
  questionIdSchema,
  answerIdSchema,
  uploadIdSchema,
  pageIdSchema,
  documentIdSchema,
  participationTypeIdSchema,
  categoryIdSchema,
  tagIdSchema,
  placeIdSchema,
  jobIdSchema,
  loginIdSchema,
  studentIdSchema,
  pendingRegistrationIdSchema,
  invitationTokenSchema,
  csrfTokenSchema,
  activityLogIdSchema,
  contactSubmissionIdSchema,
  toUserId,
  toCircleId,
  toFormId,
  toQuestionId,
  toAnswerId,
  toUploadId,
  toPageId,
  toDocumentId,
  toParticipationTypeId,
  toCategoryId,
  toTagId,
  toPlaceId,
  toJobId,
  toLoginId,
  toStudentId,
  toPendingRegistrationId,
  toInvitationToken,
  toCsrfToken,
  toActivityLogId,
  toContactSubmissionId
} from '@/lib/types/branded'

export {
  userIdSchema,
  circleIdSchema,
  formIdSchema,
  questionIdSchema,
  answerIdSchema,
  uploadIdSchema,
  pageIdSchema,
  documentIdSchema,
  participationTypeIdSchema,
  categoryIdSchema,
  tagIdSchema,
  placeIdSchema,
  jobIdSchema,
  loginIdSchema,
  studentIdSchema,
  pendingRegistrationIdSchema,
  invitationTokenSchema,
  csrfTokenSchema,
  activityLogIdSchema,
  contactSubmissionIdSchema,
  toUserId,
  toCircleId,
  toFormId,
  toQuestionId,
  toAnswerId,
  toUploadId,
  toPageId,
  toDocumentId,
  toParticipationTypeId,
  toCategoryId,
  toTagId,
  toPlaceId,
  toJobId,
  toLoginId,
  toStudentId,
  toPendingRegistrationId,
  toInvitationToken,
  toCsrfToken,
  toActivityLogId,
  toContactSubmissionId
}

export type {
  UserId,
  CircleId,
  FormId,
  QuestionId,
  AnswerId,
  UploadId,
  PageId,
  DocumentId,
  ParticipationTypeId,
  CategoryId,
  TagId,
  PlaceId,
  JobId,
  LoginId,
  StudentId,
  PendingRegistrationId,
  InvitationToken,
  CsrfToken,
  ActivityLogId,
  ContactSubmissionId
} from '@/lib/types/branded'

export const formQuestionTypeSchema = z.enum([
  'heading',
  'text',
  'textarea',
  'markdown',
  'number',
  'radio',
  'select',
  'checkbox',
  'upload'
])

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new Error(`Invalid ${label} response`)
  }

  return parsed.data
}

export function parseArrayWithSchema<T>(schema: z.ZodType<T>, value: unknown, label: string): T[] {
  return parseWithSchema(schema.array(), value, label)
}

export const stringArraySchema = z.array(z.string())
const apiRelativePathSchema = z
  .string()
  .trim()
  .regex(/^\/(?!\/)/)

export const paginatedResultSchema = <TItem extends z.ZodType>(itemSchema: TItem) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number(),
    pageSize: z.number(),
    total: z.number()
  })

export const pageSummarySchema = z.object({
  id: pageIdSchema,
  title: z.string(),
  summary: z.string(),
  isLimited: z.boolean(),
  isNew: z.boolean(),
  isUnread: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const pageDocumentSchema = z.object({
  id: documentIdSchema,
  name: z.string(),
  description: z.string(),
  isImportant: z.boolean(),
  extension: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string(),
  downloadUrl: apiRelativePathSchema
})

export const pageDetailSchema = z.object({
  id: pageIdSchema,
  title: z.string(),
  body: z.string(),
  isLimited: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  documents: z.array(pageDocumentSchema)
})

export const selectableCircleSchema = z.object({
  id: circleIdSchema,
  name: z.string(),
  groupName: z.string(),
  participationTypeName: z.string(),
  submittedAt: z.string().nullable().default(null),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending')
})

export const circleDetailSchema = z.object({
  id: circleIdSchema,
  name: z.string(),
  nameYomi: z.string(),
  groupName: z.string(),
  groupNameYomi: z.string(),
  participationTypeId: participationTypeIdSchema,
  participationTypeName: z.string(),
  formId: formIdSchema.default('' as FormId),
  notes: z.string(),
  leaderDisplayName: z.string().default(''),
  canChangeGroupName: z.boolean().default(true),
  isLeader: z.boolean().default(false),
  lastUpdatedAt: z.string().default(''),
  usersCountMin: z.number().default(1),
  usersCountMax: z.number().default(1),
  memberCount: z.number().default(0),
  canSubmit: z.boolean().default(false),
  formDescription: z.string().default(''),
  confirmationMessage: z.string().default(''),
  questions: z.array(z.lazy(() => formQuestionSchema)).default([]),
  answer: z
    .object({
      id: answerIdSchema,
      body: z.string(),
      updatedAt: z.string(),
      details: z.record(z.string(), z.array(z.string())),
      uploads: z.array(
        z.object({
          id: uploadIdSchema,
          questionId: questionIdSchema,
          filename: z.string(),
          mimeType: z.string(),
          sizeBytes: z.number(),
          createdAt: z.string()
        })
      )
    })
    .nullable()
    .default(null),
  invitationToken: invitationTokenSchema,
  submittedAt: z.string().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  statusReason: z.string().default(''),
  formCloseAt: z.string().default(''),
  places: z.array(placeIdSchema).default([])
})

export const circleMemberSchema = z.object({
  userId: userIdSchema,
  displayName: z.string(),
  isLeader: z.boolean()
})

export const addCircleMemberInputSchema = z.object({
  loginId: loginIdSchema.trim().min(1)
})

export const sessionCircleSchema = z.object({
  id: circleIdSchema,
  name: z.string()
})

export const sessionUserSchema = z.object({
  id: userIdSchema,
  displayName: z.string(),
  canDeleteAccount: z.boolean().default(false),
  canCreateCircleRegistration: z.boolean().default(true),
  studentId: studentIdSchema.default('' as StudentId),
  univemail: z.string().default(''),
  lastName: z.string().default(''),
  lastNameReading: z.string().default(''),
  firstName: z.string().default(''),
  firstNameReading: z.string().default(''),
  contactEmail: z.string().default(''),
  phoneNumber: z.string().default('')
})

export const sessionBootstrapSchema = z.object({
  csrfToken: csrfTokenSchema,
  featureFlags: stringArraySchema,
  roles: stringArraySchema,
  permissions: stringArraySchema.optional(),
  currentCircle: sessionCircleSchema.nullable(),
  user: sessionUserSchema.nullable()
})

export const documentSummarySchema = z.object({
  id: documentIdSchema,
  name: z.string(),
  description: z.string(),
  isImportant: z.boolean(),
  isNew: z.boolean(),
  extension: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string(),
  downloadUrl: apiRelativePathSchema
})

export const contactCategorySchema = z.object({
  id: categoryIdSchema,
  name: z.string()
})

export const contactSubmissionSchema = z.object({
  id: contactSubmissionIdSchema,
  categoryId: categoryIdSchema,
  categoryName: z.string(),
  subject: z.string(),
  status: z.string(),
  createdAt: z.string()
})

export const staffStatusSchema = z.object({
  allowed: z.boolean(),
  authorized: z.boolean()
})

export const staffVerifyRequestResultSchema = z.object({
  message: z.string()
})

export const authVerificationStatusItemSchema = z.object({
  type: z.enum(['email', 'univemail']),
  label: z.string(),
  address: z.string(),
  verified: z.boolean()
})

export const authVerificationStatusSchema = z.object({
  userId: userIdSchema,
  displayName: z.string(),
  completed: z.boolean(),
  items: z.array(authVerificationStatusItemSchema)
})

export const authVerificationLinkVerifySchema = z.object({
  completed: z.boolean()
})

export const registrationStartResultSchema = z.object({
  message: z.string()
})

export const passwordResetStartResultSchema = z.object({
  message: z.string()
})

export const passwordResetVerificationSchema = z.object({
  userId: userIdSchema,
  valid: z.boolean()
})

export const registrationVerificationSchema = z.object({
  pendingRegistrationId: pendingRegistrationIdSchema,
  univemail: z.string(),
  studentId: studentIdSchema,
  verified: z.boolean()
})

export const staffActivityLogSchema = z.object({
  id: activityLogIdSchema,
  actorUserId: userIdSchema,
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  circleId: circleIdSchema,
  summary: z.string(),
  createdAt: z.string()
})

export const staffTagSchema = z.object({
  id: tagIdSchema,
  name: z.string(),
  createdAt: z.string().default(''),
  updatedAt: z.string().default('')
})

export const staffPlaceSchema = z.object({
  id: placeIdSchema,
  name: z.string(),
  type: z.number(),
  notes: z.string(),
  createdAt: z.string().default(''),
  updatedAt: z.string().default('')
})

export const staffContactCategorySchema = z.object({
  id: categoryIdSchema,
  name: z.string(),
  email: z.string()
})

export const staffMailSchema = z.object({
  jobId: jobIdSchema,
  template: z.string(),
  priority: z.enum(['high', 'normal']).default('normal'),
  subject: z.string(),
  body: z.string(),
  recipients: stringArraySchema,
  createdAt: z.string()
})

export const staffUserSchema = z.object({
  id: userIdSchema,
  lastName: z.string().default(''),
  lastNameReading: z.string().default(''),
  firstName: z.string().default(''),
  firstNameReading: z.string().default(''),
  displayName: z.string(),
  loginIds: stringArraySchema,
  contactEmail: z.string().default(''),
  univemail: z.string().default(''),
  phoneNumber: z.string().default(''),
  roles: stringArraySchema,
  isVerified: z.boolean(),
  isEmailVerified: z.boolean().default(false),
  createdAt: z.string().default(''),
  updatedAt: z.string().default('')
})

export const staffCircleSchema = z.object({
  id: circleIdSchema,
  name: z.string(),
  nameYomi: z.string(),
  groupName: z.string(),
  groupNameYomi: z.string(),
  participationTypeId: participationTypeIdSchema,
  participationTypeName: z.string(),
  tags: z.array(tagIdSchema),
  notes: z.string(),
  submittedAt: z.string().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']),
  statusReason: z.string(),
  statusSetAt: z.string().nullable(),
  statusSetById: userIdSchema.nullable(),
  places: z.array(placeIdSchema)
})

export const staffCircleMailRecipientSchema = z.object({
  id: userIdSchema,
  displayName: z.string(),
  loginIds: stringArraySchema,
  isLeader: z.boolean()
})

export const staffCircleMemberSchema = z.object({
  userId: userIdSchema,
  displayName: z.string(),
  loginIds: stringArraySchema,
  isLeader: z.boolean()
})

export const staffCircleMailFormSchema = z.object({
  circle: staffCircleSchema,
  recipients: z.array(staffCircleMailRecipientSchema)
})

export const formQuestionSchema = z.object({
  id: questionIdSchema,
  name: z.string(),
  description: z.string(),
  type: formQuestionTypeSchema,
  isRequired: z.boolean(),
  isPermanent: z.boolean().default(false),
  numberMin: z.number().nullable(),
  numberMax: z.number().nullable(),
  allowedTypes: z.string(),
  options: stringArraySchema,
  priority: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const formSummarySchema = z.object({
  id: formIdSchema,
  name: z.string(),
  description: z.string(),
  openAt: z.string(),
  closeAt: z.string(),
  maxAnswers: z.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: z.string(),
  isPublic: z.boolean(),
  isOpen: z.boolean(),
  hasAnswer: z.boolean()
})

export const formDetailSchema = z.object({
  id: formIdSchema,
  name: z.string(),
  description: z.string(),
  openAt: z.string(),
  closeAt: z.string(),
  maxAnswers: z.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: z.string(),
  isPublic: z.boolean(),
  isOpen: z.boolean(),
  currentCircleStatus: z.enum(['pending', 'approved', 'rejected']),
  questions: z.array(formQuestionSchema)
})

export const answerUploadSchema = z.object({
  id: uploadIdSchema,
  questionId: questionIdSchema,
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string()
})

export const answerDetailsSchema = z.record(z.string(), z.array(z.string()))

export const formAnswerSchema = z.object({
  id: answerIdSchema,
  body: z.string(),
  updatedAt: z.string(),
  details: answerDetailsSchema,
  uploads: z.array(answerUploadSchema)
})

export const formAnswerEnvelopeSchema = z.object({
  answer: formAnswerSchema.nullable()
})

export const staffManagedCircleSchema = z.object({
  id: circleIdSchema,
  name: z.string()
})

export const staffFormSummarySchema = z.object({
  circle: staffManagedCircleSchema.default({ id: '' as CircleId, name: '' }),
  id: formIdSchema,
  name: z.string(),
  description: z.string(),
  openAt: z.string(),
  closeAt: z.string(),
  maxAnswers: z.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: z.string(),
  isPublic: z.boolean(),
  isOpen: z.boolean(),
  createdAt: z.string().default(''),
  updatedAt: z.string().default(''),
  isParticipationForm: z.boolean().default(false)
})

export const staffFormUploadSchema = answerUploadSchema

export const staffFormAnswerSchema = z.object({
  id: answerIdSchema,
  body: z.string(),
  updatedAt: z.string(),
  details: answerDetailsSchema,
  uploads: z.array(staffFormUploadSchema)
})

export const staffFormDetailSchema = staffFormSummarySchema.extend({
  questions: z.array(formQuestionSchema),
  answer: staffFormAnswerSchema.nullable()
})

export const staffFormPreviewSchema = z.object({
  id: formIdSchema,
  name: z.string(),
  description: z.string(),
  openAt: z.string(),
  closeAt: z.string(),
  answerableTags: stringArraySchema.nullish().transform((value) => value ?? []),
  confirmationMessage: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  isPublic: z.boolean(),
  isOpen: z.boolean(),
  maxAnswers: z.number(),
  questions: z.array(formQuestionSchema)
})

export const staffAnswerCircleSchema = z.object({
  id: circleIdSchema,
  name: z.string(),
  groupName: z.string(),
  participationTypeName: z.string()
})

export const staffManagedFormAnswerSummarySchema = z.object({
  id: answerIdSchema,
  circle: staffAnswerCircleSchema,
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  uploadCount: z.number(),
  details: answerDetailsSchema
})

export const staffManagedFormAnswerValueSchema = z.object({
  id: answerIdSchema,
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  details: answerDetailsSchema,
  uploads: z.array(staffFormUploadSchema)
})

export const staffFormAnswersIndexSchema = z.object({
  form: staffFormDetailSchema,
  answers: z.array(staffManagedFormAnswerSummarySchema),
  circles: z.array(staffAnswerCircleSchema),
  notAnsweredCircles: z.array(staffAnswerCircleSchema)
})

export const staffManagedFormAnswerDetailSchema = z.object({
  form: staffFormDetailSchema,
  circle: staffAnswerCircleSchema,
  answer: staffManagedFormAnswerValueSchema,
  siblingAnswers: z.array(staffManagedFormAnswerSummarySchema)
})

export const existingAnswerConflictSchema = z.object({
  existingAnswerId: answerIdSchema
})

export const staffPageSummarySchema = z.object({
  id: pageIdSchema,
  title: z.string(),
  body: z.string(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isPinned: z.boolean(),
  isPublic: z.boolean(),
  viewableTags: stringArraySchema,
  documentIds: z.array(documentIdSchema),
  documents: z.array(pageDocumentSchema)
})

export const staffPageDocumentSchema = pageDocumentSchema

export const staffPageDetailSchema = staffPageSummarySchema

export const staffDocumentSummarySchema = z.object({
  circle: staffManagedCircleSchema.default({ id: '' as CircleId, name: '' }),
  id: documentIdSchema,
  name: z.string(),
  description: z.string(),
  notes: z.string(),
  isImportant: z.boolean(),
  filename: z.string(),
  extension: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  isPublic: z.boolean(),
  viewableTags: stringArraySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  downloadUrl: apiRelativePathSchema
})

export const staffDocumentDetailSchema = staffDocumentSummarySchema.extend({
  notes: z.string(),
  viewableTags: stringArraySchema
})

export const staffPermissionDefinitionSchema = z.object({
  name: z.string(),
  group: z.string(),
  displayName: z.string(),
  shortName: z.string(),
  description: z.string()
})

export const staffPermissionUserSummarySchema = z.object({
  id: userIdSchema,
  displayName: z.string(),
  loginIds: stringArraySchema,
  roles: stringArraySchema,
  permissions: z.array(staffPermissionDefinitionSchema),
  isEditable: z.boolean()
})

export const staffPermissionDetailSchema = z.object({
  user: staffPermissionUserSummarySchema,
  definedPermissions: z.array(staffPermissionDefinitionSchema),
  assignedPermissionNames: stringArraySchema
})

export const staffParticipationTypeFormSchema = z.object({
  id: formIdSchema,
  name: z.string(),
  description: z.string(),
  openAt: z.string(),
  closeAt: z.string(),
  isPublic: z.boolean(),
  isOpen: z.boolean(),
  maxAnswers: z.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: z.string()
})

export const participationTypeFormSchema = staffParticipationTypeFormSchema

export const participationTypeSchema = z.object({
  id: participationTypeIdSchema,
  name: z.string(),
  description: z.string(),
  usersCountMin: z.number(),
  usersCountMax: z.number(),
  tags: z.array(tagIdSchema),
  form: participationTypeFormSchema
})

export const publicHomeLoginMethodSchema = z.object({
  roleLabel: z.string(),
  loginId: z.string(),
  password: z.string()
})

export const publicHomePageSchema = z.object({
  id: pageIdSchema,
  title: z.string(),
  summary: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isLimited: z.boolean(),
  isNew: z.boolean()
})

export const publicPinnedPageSchema = z.object({
  id: pageIdSchema,
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isLimited: z.boolean(),
  isNew: z.boolean(),
  documents: z.array(pageDocumentSchema)
})

export const publicHomeDocumentSchema = z.object({
  id: documentIdSchema,
  name: z.string(),
  description: z.string(),
  isImportant: z.boolean(),
  isNew: z.boolean(),
  extension: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string(),
  downloadUrl: apiRelativePathSchema
})

export const publicConfigSchema = z.object({
  isDemo: z.boolean(),
  appName: z.string(),
  portalStudentIdName: z.string(),
  portalUnivemailName: z.string(),
  portalUnivemailDomainPart: z.string()
})

export const publicHomeSchema = z.object({
  appName: z.string(),
  portalDescription: z.string(),
  portalAdminName: z.string(),
  portalContactEmail: z.string(),
  loginMethods: z.array(publicHomeLoginMethodSchema),
  pinnedPages: z.array(publicPinnedPageSchema),
  participationTypes: z.array(participationTypeSchema),
  pages: z.array(publicHomePageSchema),
  documents: z.array(publicHomeDocumentSchema)
})

export const staffParticipationTypeSchema = z.object({
  id: participationTypeIdSchema,
  name: z.string(),
  description: z.string(),
  usersCountMin: z.number(),
  usersCountMax: z.number(),
  tags: z.array(tagIdSchema),
  form: staffParticipationTypeFormSchema
})
