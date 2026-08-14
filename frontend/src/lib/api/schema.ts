import * as v from 'valibot'
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

export const formQuestionTypeSchema = v.picklist([
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

export function parseWithSchema<TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: TSchema,
  value: unknown,
  label: string
): v.InferOutput<TSchema> {
  const parsed = v.safeParse(schema, value)
  if (!parsed.success) {
    throw new Error(`Invalid ${label} response`)
  }

  return parsed.output
}

export function parseArrayWithSchema<TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  schema: TSchema,
  value: unknown,
  label: string
): v.InferOutput<TSchema>[] {
  return parseWithSchema(v.array(schema), value, label)
}

export const stringArraySchema = v.array(v.string())
const apiRelativePathSchema = v.pipe(v.string(), v.trim(), v.regex(/^\/(?!\/)/))

export const formQuestionSchema = v.object({
  id: questionIdSchema,
  name: v.string(),
  description: v.string(),
  type: formQuestionTypeSchema,
  isRequired: v.boolean(),
  isPermanent: v.optional(v.boolean(), false),
  numberMin: v.nullable(v.number()),
  numberMax: v.nullable(v.number()),
  allowedTypes: v.string(),
  options: stringArraySchema,
  priority: v.number(),
  createdAt: v.string(),
  updatedAt: v.string()
})

export const paginatedResultSchema = <TItem extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  itemSchema: TItem
) =>
  v.object({
    items: v.array(itemSchema),
    page: v.number(),
    pageSize: v.number(),
    total: v.number(),
    totalUnfiltered: v.optional(v.number())
  })

export const pageSummarySchema = v.object({
  id: pageIdSchema,
  title: v.string(),
  summary: v.string(),
  isLimited: v.boolean(),
  isNew: v.boolean(),
  isUnread: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.string()
})

export const pageDocumentSchema = v.object({
  id: documentIdSchema,
  name: v.string(),
  description: v.string(),
  isImportant: v.boolean(),
  extension: v.string(),
  sizeBytes: v.number(),
  updatedAt: v.string(),
  downloadUrl: apiRelativePathSchema
})

export const pageDetailSchema = v.object({
  id: pageIdSchema,
  title: v.string(),
  body: v.string(),
  isLimited: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.string(),
  documents: v.array(pageDocumentSchema)
})

export const selectableCircleSchema = v.object({
  id: circleIdSchema,
  name: v.string(),
  groupName: v.string(),
  participationTypeName: v.string(),
  submittedAt: v.optional(v.nullable(v.string()), null),
  status: v.optional(v.picklist(['pending', 'approved', 'rejected']), 'pending')
})

export const circleDetailSchema = v.object({
  id: circleIdSchema,
  name: v.string(),
  nameYomi: v.string(),
  groupName: v.string(),
  groupNameYomi: v.string(),
  participationTypeId: participationTypeIdSchema,
  participationTypeName: v.string(),
  formId: v.optional(formIdSchema, '' as FormId),
  notes: v.string(),
  leaderDisplayName: v.optional(v.string(), ''),
  canChangeGroupName: v.optional(v.boolean(), true),
  isLeader: v.optional(v.boolean(), false),
  lastUpdatedAt: v.optional(v.string(), ''),
  usersCountMin: v.optional(v.number(), 1),
  usersCountMax: v.optional(v.number(), 1),
  memberCount: v.optional(v.number(), 0),
  canSubmit: v.optional(v.boolean(), false),
  formDescription: v.optional(v.string(), ''),
  confirmationMessage: v.optional(v.string(), ''),
  questions: v.optional(v.array(formQuestionSchema), []),
  answer: v.optional(
    v.nullable(
      v.object({
        id: answerIdSchema,
        body: v.string(),
        updatedAt: v.string(),
        details: v.record(v.string(), v.array(v.string())),
        uploads: v.array(
          v.object({
            id: uploadIdSchema,
            questionId: questionIdSchema,
            filename: v.string(),
            mimeType: v.string(),
            sizeBytes: v.number(),
            createdAt: v.string()
          })
        )
      })
    ),
    null
  ),
  invitationToken: invitationTokenSchema,
  submittedAt: v.nullable(v.string()),
  status: v.optional(v.picklist(['pending', 'approved', 'rejected']), 'pending'),
  statusReason: v.optional(v.string(), ''),
  formCloseAt: v.optional(v.string(), ''),
  places: v.optional(v.array(v.string()), [])
})

export const circleMemberSchema = v.object({
  userId: userIdSchema,
  displayName: v.string(),
  isLeader: v.boolean()
})

export const addCircleMemberInputSchema = v.object({
  loginId: v.pipe(v.string(), v.trim(), v.minLength(1))
})

export const sessionCircleSchema = v.object({
  id: circleIdSchema,
  name: v.string()
})

export const sessionUserSchema = v.object({
  id: userIdSchema,
  displayName: v.string(),
  canDeleteAccount: v.optional(v.boolean(), false),
  canCreateCircleRegistration: v.optional(v.boolean(), true),
  studentId: v.optional(studentIdSchema, '' as StudentId),
  univemail: v.optional(v.string(), ''),
  lastName: v.optional(v.string(), ''),
  lastNameReading: v.optional(v.string(), ''),
  firstName: v.optional(v.string(), ''),
  firstNameReading: v.optional(v.string(), ''),
  contactEmail: v.optional(v.string(), ''),
  phoneNumber: v.optional(v.string(), '')
})

export const sessionBootstrapSchema = v.object({
  csrfToken: csrfTokenSchema,
  featureFlags: stringArraySchema,
  roles: stringArraySchema,
  permissions: v.optional(stringArraySchema),
  currentCircle: v.nullable(sessionCircleSchema),
  user: v.nullable(sessionUserSchema)
})

export const documentSummarySchema = v.object({
  id: documentIdSchema,
  name: v.string(),
  description: v.string(),
  isImportant: v.boolean(),
  isNew: v.boolean(),
  extension: v.string(),
  sizeBytes: v.number(),
  updatedAt: v.string(),
  downloadUrl: apiRelativePathSchema
})

export const contactCategorySchema = v.object({
  id: categoryIdSchema,
  name: v.string()
})

export const contactSubmissionSchema = v.object({
  id: contactSubmissionIdSchema,
  categoryId: categoryIdSchema,
  categoryName: v.string(),
  subject: v.string(),
  status: v.string(),
  createdAt: v.string(),
  attachment: v.optional(
    v.object({
      filename: v.string(),
      mimeType: v.string(),
      sizeBytes: v.number()
    })
  )
})

export const staffStatusSchema = v.object({
  allowed: v.boolean(),
  authorized: v.boolean()
})

export const staffVerifyRequestResultSchema = v.object({
  message: v.string()
})

export const authVerificationStatusItemSchema = v.object({
  type: v.picklist(['email', 'univemail']),
  label: v.string(),
  address: v.string(),
  verified: v.boolean()
})

export const authVerificationStatusSchema = v.object({
  userId: userIdSchema,
  displayName: v.string(),
  completed: v.boolean(),
  items: v.array(authVerificationStatusItemSchema)
})

export const authVerificationLinkVerifySchema = v.object({
  completed: v.boolean()
})

export const registrationStartResultSchema = v.object({
  message: v.string()
})

export const passwordResetStartResultSchema = v.object({
  message: v.string()
})

export const passwordResetVerificationSchema = v.object({
  userId: userIdSchema,
  valid: v.boolean()
})

export const registrationVerificationSchema = v.object({
  pendingRegistrationId: pendingRegistrationIdSchema,
  univemail: v.string(),
  studentId: studentIdSchema,
  verified: v.boolean()
})

export const staffActivityLogSchema = v.object({
  id: activityLogIdSchema,
  actorUserId: userIdSchema,
  action: v.string(),
  targetType: v.string(),
  targetId: v.string(),
  circleId: circleIdSchema,
  summary: v.string(),
  createdAt: v.string()
})

export const staffTagSchema = v.object({
  id: tagIdSchema,
  name: v.string(),
  color: v.optional(v.picklist(['gray', 'red', 'orange', 'green', 'blue', 'purple']), 'gray'),
  createdAt: v.optional(v.string(), ''),
  updatedAt: v.optional(v.string(), '')
})

export const staffPlaceSchema = v.object({
  id: placeIdSchema,
  name: v.string(),
  type: v.number(),
  notes: v.string(),
  createdAt: v.optional(v.string(), ''),
  updatedAt: v.optional(v.string(), '')
})

export const staffContactCategorySchema = v.object({
  id: categoryIdSchema,
  name: v.string(),
  email: v.string()
})

export const staffMailSchema = v.object({
  jobId: jobIdSchema,
  template: v.string(),
  priority: v.optional(v.picklist(['high', 'normal']), 'normal'),
  subject: v.string(),
  body: v.string(),
  recipients: stringArraySchema,
  createdAt: v.string()
})

export const staffUserSchema = v.object({
  id: userIdSchema,
  lastName: v.optional(v.string(), ''),
  lastNameReading: v.optional(v.string(), ''),
  firstName: v.optional(v.string(), ''),
  firstNameReading: v.optional(v.string(), ''),
  displayName: v.string(),
  loginIds: stringArraySchema,
  contactEmail: v.optional(v.string(), ''),
  univemail: v.optional(v.string(), ''),
  phoneNumber: v.optional(v.string(), ''),
  roles: stringArraySchema,
  isVerified: v.boolean(),
  isEmailVerified: v.optional(v.boolean(), false),
  createdAt: v.optional(v.string(), ''),
  updatedAt: v.optional(v.string(), '')
})

export const staffFormRecipientCandidateSchema = v.object({
  id: userIdSchema,
  displayName: v.string(),
  loginIds: stringArraySchema,
  contactEmail: v.optional(v.string(), '')
})

export const staffCircleSchema = v.object({
  id: circleIdSchema,
  name: v.string(),
  nameYomi: v.string(),
  groupName: v.string(),
  groupNameYomi: v.string(),
  participationTypeId: participationTypeIdSchema,
  participationTypeName: v.string(),
  tags: v.array(tagIdSchema),
  notes: v.string(),
  submittedAt: v.nullable(v.string()),
  status: v.picklist(['pending', 'approved', 'rejected']),
  statusReason: v.string(),
  statusSetAt: v.nullable(v.string()),
  statusSetById: v.nullable(userIdSchema),
  places: v.array(v.string())
})

export const staffCircleMailRecipientSchema = v.object({
  id: userIdSchema,
  displayName: v.string(),
  loginIds: stringArraySchema,
  isLeader: v.boolean()
})

export const staffCircleMemberSchema = v.object({
  userId: userIdSchema,
  displayName: v.string(),
  loginIds: stringArraySchema,
  isLeader: v.boolean()
})

export const staffCircleMailFormSchema = v.object({
  circle: staffCircleSchema,
  recipients: v.array(staffCircleMailRecipientSchema)
})

export const formSummarySchema = v.object({
  id: formIdSchema,
  name: v.string(),
  description: v.string(),
  openAt: v.string(),
  closeAt: v.string(),
  maxAnswers: v.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: v.string(),
  isPublic: v.boolean(),
  isOpen: v.boolean(),
  hasAnswer: v.boolean()
})

export const formDetailSchema = v.object({
  id: formIdSchema,
  name: v.string(),
  description: v.string(),
  openAt: v.string(),
  closeAt: v.string(),
  maxAnswers: v.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: v.string(),
  isPublic: v.boolean(),
  isOpen: v.boolean(),
  currentCircleStatus: v.picklist(['pending', 'approved', 'rejected']),
  questions: v.array(formQuestionSchema)
})

export const answerUploadSchema = v.object({
  id: uploadIdSchema,
  questionId: questionIdSchema,
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  createdAt: v.string()
})

export const answerDetailsSchema = v.record(v.string(), v.array(v.string()))

export const formAnswerSchema = v.object({
  id: answerIdSchema,
  body: v.string(),
  updatedAt: v.string(),
  details: answerDetailsSchema,
  uploads: v.array(answerUploadSchema)
})

export const formAnswerEnvelopeSchema = v.object({
  answer: v.nullable(formAnswerSchema)
})

export const staffManagedCircleSchema = v.object({
  id: circleIdSchema,
  name: v.string()
})

const staffFormSummaryEntries = {
  circle: v.optional(staffManagedCircleSchema, { id: '' as CircleId, name: '' }),
  id: formIdSchema,
  name: v.string(),
  description: v.string(),
  openAt: v.string(),
  closeAt: v.string(),
  maxAnswers: v.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: v.string(),
  staffNotificationUserIds: v.optional(stringArraySchema, []),
  isPublic: v.boolean(),
  isOpen: v.boolean(),
  createdAt: v.optional(v.string(), ''),
  updatedAt: v.optional(v.string(), ''),
  isParticipationForm: v.optional(v.boolean(), false)
}

export const staffFormSummarySchema = v.object(staffFormSummaryEntries)

export const staffFormUploadSchema = answerUploadSchema

export const staffFormAnswerSchema = v.object({
  id: answerIdSchema,
  body: v.string(),
  updatedAt: v.string(),
  details: answerDetailsSchema,
  uploads: v.array(staffFormUploadSchema)
})

export const staffFormDetailSchema = v.object({
  ...staffFormSummaryEntries,
  questions: v.array(formQuestionSchema),
  answer: v.nullable(staffFormAnswerSchema)
})

export const staffFormPreviewSchema = v.object({
  id: formIdSchema,
  name: v.string(),
  description: v.string(),
  openAt: v.string(),
  closeAt: v.string(),
  answerableTags: v.pipe(
    v.nullish(stringArraySchema),
    v.transform((value) => value ?? [])
  ),
  confirmationMessage: v.pipe(
    v.nullish(v.string()),
    v.transform((value) => value ?? '')
  ),
  isPublic: v.boolean(),
  isOpen: v.boolean(),
  maxAnswers: v.number(),
  questions: v.array(formQuestionSchema)
})

export const staffAnswerCircleSchema = v.object({
  id: circleIdSchema,
  name: v.string(),
  groupName: v.string(),
  participationTypeName: v.string()
})

export const staffManagedFormAnswerSummarySchema = v.object({
  id: answerIdSchema,
  circle: staffAnswerCircleSchema,
  body: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  uploadCount: v.number(),
  details: answerDetailsSchema
})

export const staffManagedFormAnswerValueSchema = v.object({
  id: answerIdSchema,
  body: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  details: answerDetailsSchema,
  uploads: v.array(staffFormUploadSchema)
})

export const staffFormAnswersIndexSchema = v.object({
  form: staffFormDetailSchema,
  answers: v.array(staffManagedFormAnswerSummarySchema),
  circles: v.array(staffAnswerCircleSchema),
  notAnsweredCircles: v.array(staffAnswerCircleSchema)
})

export const staffManagedFormAnswerDetailSchema = v.object({
  form: staffFormDetailSchema,
  circle: staffAnswerCircleSchema,
  answer: staffManagedFormAnswerValueSchema,
  siblingAnswers: v.array(staffManagedFormAnswerSummarySchema)
})

export const existingAnswerConflictSchema = v.object({
  existingAnswerId: answerIdSchema
})

export const staffPageSummarySchema = v.object({
  id: pageIdSchema,
  title: v.string(),
  body: v.string(),
  notes: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  publishedAt: v.string(),
  isPinned: v.boolean(),
  isPublic: v.boolean(),
  mailScheduled: v.boolean(),
  viewableTags: stringArraySchema,
  documentIds: v.array(documentIdSchema),
  documents: v.array(pageDocumentSchema)
})

export const staffPageDocumentSchema = pageDocumentSchema

export const staffPageDetailSchema = staffPageSummarySchema

const staffDocumentSummaryEntries = {
  circle: v.optional(staffManagedCircleSchema, { id: '' as CircleId, name: '' }),
  id: documentIdSchema,
  name: v.string(),
  description: v.string(),
  notes: v.string(),
  isImportant: v.boolean(),
  filename: v.string(),
  extension: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  isPublic: v.boolean(),
  viewableTags: stringArraySchema,
  createdAt: v.string(),
  updatedAt: v.string(),
  downloadUrl: apiRelativePathSchema
}

export const staffDocumentSummarySchema = v.object(staffDocumentSummaryEntries)

export const staffDocumentDetailSchema = v.object({
  ...staffDocumentSummaryEntries,
  notes: v.string(),
  viewableTags: stringArraySchema
})

export const staffPermissionDefinitionSchema = v.object({
  name: v.string(),
  group: v.string(),
  displayName: v.string(),
  shortName: v.string(),
  description: v.string()
})

export const staffPermissionUserSummarySchema = v.object({
  id: userIdSchema,
  displayName: v.string(),
  loginIds: stringArraySchema,
  roles: stringArraySchema,
  permissions: v.array(staffPermissionDefinitionSchema),
  isEditable: v.boolean()
})

export const staffPermissionDetailSchema = v.object({
  user: staffPermissionUserSummarySchema,
  definedPermissions: v.array(staffPermissionDefinitionSchema),
  assignedPermissionNames: stringArraySchema
})

export const staffParticipationTypeFormSchema = v.object({
  id: formIdSchema,
  name: v.string(),
  description: v.string(),
  openAt: v.string(),
  closeAt: v.string(),
  isPublic: v.boolean(),
  isOpen: v.boolean(),
  maxAnswers: v.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: v.string()
})

export const participationTypeFormSchema = staffParticipationTypeFormSchema

export const participationTypeSchema = v.object({
  id: participationTypeIdSchema,
  name: v.string(),
  description: v.string(),
  usersCountMin: v.number(),
  usersCountMax: v.number(),
  tags: v.array(tagIdSchema),
  form: participationTypeFormSchema
})

export const publicHomeLoginMethodSchema = v.object({
  roleLabel: v.string(),
  loginId: v.string(),
  password: v.string()
})

export const publicHomePageSchema = v.object({
  id: pageIdSchema,
  title: v.string(),
  summary: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  isLimited: v.boolean(),
  isNew: v.boolean()
})

export const publicPinnedPageSchema = v.object({
  id: pageIdSchema,
  title: v.string(),
  body: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  isLimited: v.boolean(),
  isNew: v.boolean(),
  documents: v.array(pageDocumentSchema)
})

export const publicHomeDocumentSchema = v.object({
  id: documentIdSchema,
  name: v.string(),
  description: v.string(),
  isImportant: v.boolean(),
  isNew: v.boolean(),
  extension: v.string(),
  sizeBytes: v.number(),
  updatedAt: v.string(),
  downloadUrl: apiRelativePathSchema
})

export const publicConfigSchema = v.object({
  isDemo: v.boolean(),
  appName: v.string(),
  portalStudentIdName: v.string(),
  portalUnivemailName: v.string(),
  portalUnivemailDomainPart: v.string()
})

export const publicHomeSchema = v.object({
  appName: v.string(),
  portalDescription: v.string(),
  portalAdminName: v.string(),
  portalContactEmail: v.string(),
  loginMethods: v.array(publicHomeLoginMethodSchema),
  pinnedPages: v.array(publicPinnedPageSchema),
  participationTypes: v.array(participationTypeSchema),
  pages: v.array(publicHomePageSchema),
  documents: v.array(publicHomeDocumentSchema)
})

export const staffParticipationTypeSchema = v.object({
  id: participationTypeIdSchema,
  name: v.string(),
  description: v.string(),
  usersCountMin: v.number(),
  usersCountMax: v.number(),
  tags: v.array(tagIdSchema),
  form: staffParticipationTypeFormSchema
})
