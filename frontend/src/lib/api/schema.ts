import { z } from 'zod'

export const formQuestionTypeSchema = z.enum([
  'heading',
  'text',
  'textarea',
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

export const stringArraySchema = z.array(z.string())

export const paginatedResultSchema = <TItem extends z.ZodType>(itemSchema: TItem) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number(),
    pageSize: z.number(),
    total: z.number()
  })

export const pageSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  summary: z.string().optional(),
  isLimited: z.boolean().optional(),
  isNew: z.boolean().optional()
})

export const pageDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isImportant: z.boolean(),
  extension: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string(),
  downloadUrl: z.string()
})

export const pageDetailSchema = pageSummarySchema.extend({
  body: z.string(),
  documents: z.array(pageDocumentSchema)
})

export const selectableCircleSchema = z.object({
  id: z.string(),
  name: z.string(),
  groupName: z.string(),
  participationTypeName: z.string()
})

export const circleDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameYomi: z.string(),
  groupName: z.string(),
  groupNameYomi: z.string(),
  participationTypeId: z.string(),
  participationTypeName: z.string(),
  notes: z.string(),
  invitationToken: z.string(),
  submittedAt: z.string().nullable()
})

export const circleMemberSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  isLeader: z.boolean()
})

export const addCircleMemberInputSchema = z.object({
  loginId: z.string().trim().min(1)
})

export const sessionCircleSchema = z.object({
  id: z.string(),
  name: z.string()
})

export const sessionUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  canDeleteAccount: z.boolean().default(false)
})

export const sessionBootstrapSchema = z.object({
  csrfToken: z.string(),
  featureFlags: stringArraySchema,
  roles: stringArraySchema,
  permissions: stringArraySchema.optional(),
  currentCircle: sessionCircleSchema.nullable(),
  user: sessionUserSchema.nullable()
})

export const documentSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isImportant: z.boolean(),
  isNew: z.boolean(),
  extension: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string(),
  downloadUrl: z.string()
})

export const contactCategorySchema = z.object({
  id: z.string(),
  name: z.string()
})

export const contactSubmissionSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
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
  deliveryMode: z.literal('mock'),
  message: z.string(),
  verifyCode: z.string()
})

export const staffActivityLogSchema = z.object({
  id: z.string(),
  actorUserId: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  circleId: z.string(),
  summary: z.string(),
  createdAt: z.string()
})

export const staffTagSchema = z.object({
  id: z.string(),
  name: z.string()
})

export const staffPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  notes: z.string()
})

export const staffContactCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
})

export const staffMailSchema = z.object({
  circle: z
    .object({
      id: z.string(),
      name: z.string()
    })
    .default({ id: '', name: '' }),
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  recipients: stringArraySchema,
  status: z.enum(['queued', 'sent']),
  createdAt: z.string(),
  deliveredAt: z.string()
})

export const staffPortalSettingsSchema = z.object({
  appName: z.string(),
  portalDescription: z.string(),
  appUrl: z.string(),
  appForceHttps: z.boolean(),
  portalAdminName: z.string(),
  portalContactEmail: z.string(),
  portalUnivemailLocalPart: z.string(),
  portalUnivemailDomainPart: z.string(),
  portalStudentIdName: z.string(),
  portalUnivemailName: z.string(),
  portalPrimaryColorH: z.number(),
  portalPrimaryColorS: z.number(),
  portalPrimaryColorL: z.number()
})

export const staffUserSchema = z.object({
  id: z.string(),
  lastName: z.string().default(''),
  lastNameReading: z.string().default(''),
  firstName: z.string().default(''),
  firstNameReading: z.string().default(''),
  displayName: z.string(),
  loginIds: stringArraySchema,
  contactEmail: z.string().default(''),
  phoneNumber: z.string().default(''),
  roles: stringArraySchema,
  isVerified: z.boolean(),
  isEmailVerified: z.boolean().default(false)
})

export const staffCircleSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameYomi: z.string(),
  groupName: z.string(),
  groupNameYomi: z.string(),
  participationTypeId: z.string(),
  participationTypeName: z.string(),
  tags: z.array(z.string()),
  notes: z.string(),
  submittedAt: z.string().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']),
  statusReason: z.string(),
  statusSetAt: z.string().nullable(),
  statusSetById: z.string().nullable(),
  places: z.array(z.string())
})

export const staffCircleMailRecipientSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  loginIds: stringArraySchema
})

export const staffCircleMailFormSchema = z.object({
  circle: staffCircleSchema,
  recipients: z.array(staffCircleMailRecipientSchema)
})

export const formQuestionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: formQuestionTypeSchema,
  isRequired: z.boolean(),
  numberMin: z.number().nullable(),
  numberMax: z.number().nullable(),
  allowedTypes: z.string(),
  options: stringArraySchema,
  priority: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const formSummarySchema = z.object({
  id: z.string(),
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
  id: z.string(),
  name: z.string(),
  description: z.string(),
  openAt: z.string(),
  closeAt: z.string(),
  maxAnswers: z.number(),
  answerableTags: stringArraySchema,
  confirmationMessage: z.string(),
  isPublic: z.boolean(),
  isOpen: z.boolean(),
  questions: z.array(formQuestionSchema)
})

export const answerUploadSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string()
})

export const answerDetailsSchema = z.record(z.string(), z.array(z.string()))

export const formAnswerSchema = z.object({
  id: z.string(),
  body: z.string(),
  updatedAt: z.string(),
  details: answerDetailsSchema,
  uploads: z.array(answerUploadSchema)
})

export const formAnswerEnvelopeSchema = z.object({
  answer: formAnswerSchema.nullable()
})

export const staffManagedCircleSchema = z.object({
  id: z.string(),
  name: z.string()
})

export const staffFormSummarySchema = z.object({
  circle: staffManagedCircleSchema.default({ id: '', name: '' }),
  id: z.string(),
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
  id: z.string(),
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
  id: z.string(),
  name: z.string(),
  description: z.string(),
  openAt: z.string(),
  closeAt: z.string(),
  answerableTags: stringArraySchema,
  confirmationMessage: z.string(),
  isPublic: z.boolean(),
  isOpen: z.boolean(),
  maxAnswers: z.number(),
  questions: z.array(formQuestionSchema)
})

export const staffAnswerCircleSchema = z.object({
  id: z.string(),
  name: z.string(),
  groupName: z.string(),
  participationTypeName: z.string()
})

export const staffManagedFormAnswerSummarySchema = z.object({
  id: z.string(),
  circle: staffAnswerCircleSchema,
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  uploadCount: z.number(),
  details: answerDetailsSchema
})

export const staffManagedFormAnswerValueSchema = z.object({
  id: z.string(),
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
  existingAnswerId: z.string()
})

export const staffPageSummarySchema = z.object({
  circle: staffManagedCircleSchema.default({ id: '', name: '' }),
  id: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  isPinned: z.boolean(),
  isPublic: z.boolean()
})

export const staffPageDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string()
})

export const staffPageDetailSchema = staffPageSummarySchema.extend({
  body: z.string(),
  notes: z.string(),
  viewableTags: stringArraySchema,
  documentIds: stringArraySchema,
  documents: z.array(staffPageDocumentSchema)
})

export const staffDocumentSummarySchema = z.object({
  circle: staffManagedCircleSchema.default({ id: '', name: '' }),
  id: z.string(),
  name: z.string(),
  description: z.string(),
  notes: z.string(),
  isImportant: z.boolean(),
  filename: z.string(),
  extension: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  isPublic: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  downloadUrl: z.string()
})

export const staffDocumentDetailSchema = staffDocumentSummarySchema.extend({
  notes: z.string()
})

export const staffPermissionDefinitionSchema = z.object({
  name: z.string(),
  group: z.string(),
  displayName: z.string(),
  shortName: z.string(),
  description: z.string()
})

export const staffPermissionUserSummarySchema = z.object({
  id: z.string(),
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
  id: z.string(),
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
  id: z.string(),
  name: z.string(),
  description: z.string(),
  usersCountMin: z.number(),
  usersCountMax: z.number(),
  tags: stringArraySchema,
  form: participationTypeFormSchema
})

export const publicHomeLoginMethodSchema = z.object({
  roleLabel: z.string(),
  loginId: z.string(),
  password: z.string()
})

export const publicHomePageSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  publishedAt: z.string(),
  isLimited: z.boolean(),
  isNew: z.boolean().optional()
})

export const publicPinnedPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  publishedAt: z.string(),
  isLimited: z.boolean(),
  documents: z.array(pageDocumentSchema)
})

export const publicHomeDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isImportant: z.boolean(),
  isNew: z.boolean(),
  extension: z.string(),
  sizeBytes: z.number(),
  updatedAt: z.string(),
  downloadUrl: z.string()
})

export const publicConfigSchema = z.object({
  isDemo: z.boolean(),
  appName: z.string()
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
  id: z.string(),
  name: z.string(),
  description: z.string(),
  usersCountMin: z.number(),
  usersCountMax: z.number(),
  tags: stringArraySchema,
  form: staffParticipationTypeFormSchema
})
