import * as z from 'zod'
import type { FormQuestion } from '@/features/forms/api'
import { categoryIdSchema, participationTypeIdSchema } from '@/lib/api/schema'

/**
 * Password validation schema
 * - At least 8 characters
 * - Must contain at least one letter and one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .regex(/[a-zA-Z]/, 'パスワードには英字を含めてください')
  .regex(/[0-9]/, 'パスワードには数字を含めてください')

/**
 * Full name validation schema
 * - Must contain a half-width space between family and given name
 */
export const fullNameSchema = z
  .string()
  .min(1, '名前を入力してください')
  .regex(/^[^\s　]+ [^\s　]+$/, '姓と名の間に半角スペースを入れてください（例: 山田 太郎）')

/**
 * Name yomi validation schema
 * - Must be hiragana with half-width space
 * Allows: hiragana characters, half-width spaces, and long vowel mark (ー)
 */
export const nameYomiSchema = z
  .string()
  .min(1, 'ふりがなを入力してください')
  .regex(/^[\u3040-\u309F\u30FC\s]+$/, 'ひらがなで入力してください')
  .regex(/^[^\s　]+ [^\s　]+$/, 'せいとめいの間に半角スペースを入れてください（例: やまだ たろう）')

/**
 * Phone number validation schema
 * - Japanese phone number format (flexible)
 */
export const phoneNumberSchema = z
  .string()
  .min(1, '電話番号を入力してください')
  .regex(/^[\d\-()]+$/, '電話番号の形式が正しくありません')

/**
 * Optional email validation schema
 */
export const optionalEmailSchema = z
  .string()
  .refine((value) => value === '' || z.string().email().safeParse(value).success, {
    message: 'メールアドレスの形式が正しくありません'
  })

/**
 * Required hiragana input schema (for yomi fields without space requirement)
 * Allows: hiragana characters, half-width spaces, and long vowel mark (ー)
 */
export const hiraganaSchema = z
  .string()
  .min(1, '入力してください')
  .regex(/^[\u3040-\u309F\u30FC\s]+$/, 'ひらがなで入力してください')

/**
 * Required text input schema with minimum length
 */
export function requiredTextSchema(fieldName: string, minLength = 1) {
  return z.string().min(minLength, `${fieldName}を入力してください`)
}

/**
 * Required email validation schema
 */
export const requiredEmailSchema = z
  .string()
  .min(1, 'メールアドレスを入力してください')
  .email('メールアドレスの形式が正しくありません')

/**
 * Profile update form schema
 */
export const profileUpdateFormSchema = z.object({
  name: fullNameSchema,
  nameYomi: nameYomiSchema,
  contactEmail: requiredEmailSchema,
  phoneNumber: phoneNumberSchema,
  currentPassword: z.string().min(1, '現在のパスワードを入力してください')
})

export type ProfileUpdateFormData = z.infer<typeof profileUpdateFormSchema>

/**
 * Password change form schema
 */
export const passwordChangeFormSchema = z
  .object({
    currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
    newPassword: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '確認用パスワードが一致しません',
    path: ['confirmPassword']
  })

export type PasswordChangeFormData = z.infer<typeof passwordChangeFormSchema>

/**
 * Contact form schema
 */
export const contactFormSchema = z.object({
  categoryId: categoryIdSchema.min(1, 'お問い合わせ項目を選択してください'),
  ccSubleader: z.boolean(),
  body: z.string().min(1, 'お問い合わせ内容を入力してください')
})

export type ContactFormData = z.infer<typeof contactFormSchema>

/**
 * User registration form schema
 */
export const userRegistrationFormSchema = z
  .object({
    name: fullNameSchema,
    nameYomi: nameYomiSchema,
    contactEmail: optionalEmailSchema,
    phoneNumber: phoneNumberSchema,
    password: passwordSchema,
    passwordConfirmation: z.string()
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: '確認用パスワードが一致しません',
    path: ['passwordConfirmation']
  })

export type UserRegistrationFormData = z.infer<typeof userRegistrationFormSchema>

export const registrationStartFormSchema = z.object({
  univemailLocalPart: requiredTextSchema('大学メールアドレス').regex(
    /^[^@\s]+$/,
    '大学メールアドレスの @ より前の部分を入力してください'
  )
})

export type RegistrationStartFormData = z.infer<typeof registrationStartFormSchema>

export const directUserRegistrationFormSchema = z
  .object({
    studentId: requiredTextSchema('学籍番号'),
    univemailLocalPart: requiredTextSchema('大学メールアドレス'),
    name: fullNameSchema,
    nameYomi: nameYomiSchema,
    contactEmail: requiredEmailSchema,
    phoneNumber: phoneNumberSchema,
    password: passwordSchema,
    passwordConfirmation: z.string()
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: '確認用パスワードが一致しません',
    path: ['passwordConfirmation']
  })

export type DirectUserRegistrationFormData = z.infer<typeof directUserRegistrationFormSchema>

/**
 * Circle registration form schema
 */
export const circleRegistrationFormSchema = z.object({
  name: requiredTextSchema('企画名'),
  nameYomi: hiraganaSchema,
  groupName: requiredTextSchema('団体名'),
  groupNameYomi: hiraganaSchema,
  participationTypeId: participationTypeIdSchema.min(1, '参加種別を選択してください'),
  notes: z.string().optional()
})

export type CircleRegistrationFormData = z.infer<typeof circleRegistrationFormSchema>

/**
 * Staff form (application form) schema
 */
export const staffFormSchema = z
  .object({
    name: requiredTextSchema('フォーム名'),
    maxAnswers: z.number().int().min(1, '1以上の値を入力してください'),
    openAt: z.string().min(1, '受付開始日時を入力してください'),
    closeAt: z.string().min(1, '受付終了日時を入力してください')
  })
  .refine((data) => !data.openAt || !data.closeAt || data.closeAt > data.openAt, {
    message: '受付終了日時は受付開始日時より後にしてください',
    path: ['closeAt']
  })

export type StaffFormData = z.infer<typeof staffFormSchema>

/**
 * Staff participation type create form schema (includes dates)
 */
export const staffParticipationTypeFormSchema = z
  .object({
    name: requiredTextSchema('参加種別名'),
    usersCountMin: z.number().int().min(1, '1以上の値を入力してください'),
    usersCountMax: z.number().int().min(1, '1以上の値を入力してください'),
    openAt: z.string().min(1, '受付開始日時を入力してください'),
    closeAt: z.string().min(1, '受付終了日時を入力してください')
  })
  .refine((data) => data.usersCountMax >= data.usersCountMin, {
    message: '最大人数は最低人数以上にしてください',
    path: ['usersCountMax']
  })
  .refine((data) => !data.openAt || !data.closeAt || data.closeAt > data.openAt, {
    message: '受付終了日時は受付開始日時より後にしてください',
    path: ['closeAt']
  })

export type StaffParticipationTypeFormData = z.infer<typeof staffParticipationTypeFormSchema>

/**
 * Staff participation type edit form schema (name + member count only)
 */
export const staffParticipationTypeEditFormSchema = z
  .object({
    name: requiredTextSchema('参加種別名'),
    usersCountMin: z.number().int().min(1, '1以上の値を入力してください'),
    usersCountMax: z.number().int().min(1, '1以上の値を入力してください')
  })
  .refine((data) => data.usersCountMax >= data.usersCountMin, {
    message: '最大人数は最低人数以上にしてください',
    path: ['usersCountMax']
  })

export type StaffParticipationTypeEditFormData = z.infer<typeof staffParticipationTypeEditFormSchema>

/**
 * Staff page (notice) form schema
 */
export const staffPageFormSchema = z.object({
  title: requiredTextSchema('タイトル'),
  body: requiredTextSchema('本文')
})

export type StaffPageFormData = z.infer<typeof staffPageFormSchema>

/**
 * Staff tag form schema
 */
export const staffTagFormSchema = z.object({
  name: requiredTextSchema('タグ名')
})

export type StaffTagFormData = z.infer<typeof staffTagFormSchema>

/**
 * Staff place form schema
 */
export const staffPlaceFormSchema = z.object({
  name: requiredTextSchema('場所名'),
  type: z.number().refine((v) => [1, 2, 3].includes(v), { message: 'タイプを選択してください' })
})

export type StaffPlaceFormData = z.infer<typeof staffPlaceFormSchema>

/**
 * Build a dynamic Zod schema for FormAnswerDraft based on the loaded questions.
 * heading/upload type questions are excluded from validation.
 */
export function buildFormAnswerSchema(questions: FormQuestion[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const question of questions) {
    if (question.type === 'heading' || question.type === 'upload') {
      continue
    }

    const fieldSchema: z.ZodTypeAny =
      question.type === 'number'
        ? z.string().superRefine((val, ctx) => {
            if (val === '' && !question.isRequired) {
              return
            }
            if (val === '') {
              ctx.addIssue({ code: 'custom', message: `${question.name}を入力してください` })
              return
            }
            const num = Number(val)
            if (isNaN(num)) {
              ctx.addIssue({ code: 'custom', message: '数値を入力してください' })
              return
            }
            if (question.numberMin !== null && num < question.numberMin) {
              ctx.addIssue({ code: 'custom', message: `${question.numberMin}以上の値を入力してください` })
            }
            if (question.numberMax !== null && num > question.numberMax) {
              ctx.addIssue({ code: 'custom', message: `${question.numberMax}以下の値を入力してください` })
            }
          })
        : question.type === 'checkbox'
          ? (() => {
              const base = z.array(z.string())
              return question.isRequired ? base.min(1, `${question.name}を選択してください`) : base
            })()
          : ['text', 'textarea', 'markdown'].includes(question.type)
            ? z.string().superRefine((val, ctx) => {
                if (val === '' && !question.isRequired) {
                  return
                }
                if (val === '') {
                  ctx.addIssue({ code: 'custom', message: `${question.name}を入力してください` })
                  return
                }
                if (question.numberMin !== null && Array.from(val).length < question.numberMin) {
                  ctx.addIssue({ code: 'custom', message: `${question.numberMin}文字以上で入力してください` })
                }
                if (question.numberMax !== null && Array.from(val).length > question.numberMax) {
                  ctx.addIssue({ code: 'custom', message: `${question.numberMax}文字以下で入力してください` })
                }
              })
            : // Select, radio
              question.isRequired
              ? z.string().min(1, `${question.name}を入力してください`)
              : z.string()

    shape[question.id] = fieldSchema
  }

  // Passthrough: allow 'legacy-body' and upload keys not in the schema
  return z.object(shape).passthrough()
}
