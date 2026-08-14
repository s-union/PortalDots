import * as v from 'valibot'
import type { FormQuestion } from '@/features/forms/api'
import { categoryIdSchema, participationTypeIdSchema } from '@/lib/api/schema'

/**
 * Password validation schema
 * - At least 8 characters
 * - Must contain at least one letter and one number
 */
export const passwordSchema = v.pipe(
  v.string(),
  v.minLength(8, 'パスワードは8文字以上で入力してください'),
  v.regex(/[a-zA-Z]/, 'パスワードには英字を含めてください'),
  v.regex(/[0-9]/, 'パスワードには数字を含めてください')
)

/**
 * Full name validation schema
 * - Must contain a half-width space between family and given name
 */
export const fullNameSchema = v.pipe(
  v.string(),
  v.minLength(1, '名前を入力してください'),
  v.regex(/^[^\s　]+ [^\s　]+$/, '姓と名の間に半角スペースを入れてください（例: 山田 太郎）')
)

/**
 * Name yomi validation schema
 * - Must be hiragana with half-width space
 * Allows: hiragana characters, half-width spaces, and long vowel mark (ー)
 */
export const nameYomiSchema = v.pipe(
  v.string(),
  v.minLength(1, 'ふりがなを入力してください'),
  v.regex(/^[\u3040-\u309F\u30FC\s]+$/, 'ひらがなで入力してください'),
  v.regex(/^[^\s　]+ [^\s　]+$/, 'せいとめいの間に半角スペースを入れてください（例: やまだ たろう）')
)

/**
 * Phone number validation schema
 * - Japanese phone number format (flexible)
 */
export const phoneNumberSchema = v.pipe(
  v.string(),
  v.minLength(1, '電話番号を入力してください'),
  v.regex(/^[\d\-()]+$/, '電話番号の形式が正しくありません')
)

/**
 * Optional email validation schema
 */
export const optionalEmailSchema = v.pipe(
  v.string(),
  v.check(
    (value) => value === '' || v.safeParse(v.pipe(v.string(), v.email()), value).success,
    'メールアドレスの形式が正しくありません'
  )
)

/**
 * Required hiragana input schema (for yomi fields without space requirement)
 * Allows: hiragana characters, half-width spaces, and long vowel mark (ー)
 */
export const hiraganaSchema = v.pipe(
  v.string(),
  v.minLength(1, '入力してください'),
  v.regex(/^[\u3040-\u309F\u30FC\s]+$/, 'ひらがなで入力してください')
)

/**
 * Required text input schema with minimum length
 */
export function requiredTextSchema(fieldName: string, minLength = 1) {
  return v.pipe(v.string(), v.minLength(minLength, `${fieldName}を入力してください`))
}

/**
 * Required email validation schema
 */
export const requiredEmailSchema = v.pipe(
  v.string(),
  v.minLength(1, 'メールアドレスを入力してください'),
  v.email('メールアドレスの形式が正しくありません')
)

/**
 * Profile update form schema
 */
export const profileUpdateFormSchema = v.object({
  name: fullNameSchema,
  nameYomi: nameYomiSchema,
  contactEmail: requiredEmailSchema,
  phoneNumber: phoneNumberSchema,
  currentPassword: v.pipe(v.string(), v.minLength(1, '現在のパスワードを入力してください'))
})

export type ProfileUpdateFormData = v.InferOutput<typeof profileUpdateFormSchema>

/**
 * Password change form schema
 */
export const passwordChangeFormSchema = v.pipe(
  v.object({
    currentPassword: v.pipe(v.string(), v.minLength(1, '現在のパスワードを入力してください')),
    newPassword: passwordSchema,
    confirmPassword: v.string()
  }),
  v.forward(
    v.partialCheck(
      [['newPassword'], ['confirmPassword']],
      (input) => input.newPassword === input.confirmPassword,
      '確認用パスワードが一致しません'
    ),
    ['confirmPassword']
  )
)

export type PasswordChangeFormData = v.InferOutput<typeof passwordChangeFormSchema>

/**
 * Contact form schema
 */
export const contactFormSchema = v.object({
  categoryId: v.pipe(categoryIdSchema, v.minLength(1, 'お問い合わせ項目を選択してください')),
  ccSubleader: v.boolean(),
  body: v.pipe(v.string(), v.minLength(1, 'お問い合わせ内容を入力してください'))
})

export type ContactFormData = v.InferOutput<typeof contactFormSchema>

/**
 * User registration form schema
 */
export const userRegistrationFormSchema = v.pipe(
  v.object({
    name: fullNameSchema,
    nameYomi: nameYomiSchema,
    contactEmail: optionalEmailSchema,
    phoneNumber: phoneNumberSchema,
    password: passwordSchema,
    passwordConfirmation: v.string()
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['passwordConfirmation']],
      (input) => input.password === input.passwordConfirmation,
      '確認用パスワードが一致しません'
    ),
    ['passwordConfirmation']
  )
)

export type UserRegistrationFormData = v.InferOutput<typeof userRegistrationFormSchema>

export const registrationStartFormSchema = v.object({
  univemailLocalPart: v.pipe(
    requiredTextSchema('大学メールアドレス'),
    v.regex(/^[^@\s]+$/, '大学メールアドレスの @ より前の部分を入力してください')
  )
})

export type RegistrationStartFormData = v.InferOutput<typeof registrationStartFormSchema>

export const directUserRegistrationFormSchema = v.pipe(
  v.object({
    studentId: requiredTextSchema('学籍番号'),
    univemailLocalPart: requiredTextSchema('大学メールアドレス'),
    name: fullNameSchema,
    nameYomi: nameYomiSchema,
    contactEmail: requiredEmailSchema,
    phoneNumber: phoneNumberSchema,
    password: passwordSchema,
    passwordConfirmation: v.string()
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['passwordConfirmation']],
      (input) => input.password === input.passwordConfirmation,
      '確認用パスワードが一致しません'
    ),
    ['passwordConfirmation']
  )
)

export type DirectUserRegistrationFormData = v.InferOutput<typeof directUserRegistrationFormSchema>

/**
 * Circle registration form schema
 */
export const circleRegistrationFormSchema = v.object({
  name: requiredTextSchema('企画名'),
  nameYomi: hiraganaSchema,
  groupName: requiredTextSchema('団体名'),
  groupNameYomi: hiraganaSchema,
  participationTypeId: v.pipe(participationTypeIdSchema, v.minLength(1, '参加種別を選択してください')),
  notes: v.optional(v.string())
})

export type CircleRegistrationFormData = v.InferOutput<typeof circleRegistrationFormSchema>

/**
 * Staff form (application form) schema
 */
export const staffFormSchema = v.pipe(
  v.object({
    name: requiredTextSchema('フォーム名'),
    maxAnswers: v.pipe(v.number(), v.integer(), v.minValue(1, '1以上の値を入力してください')),
    openAt: v.pipe(v.string(), v.minLength(1, '受付開始日時を入力してください')),
    closeAt: v.pipe(v.string(), v.minLength(1, '受付終了日時を入力してください'))
  }),
  v.forward(
    v.partialCheck(
      [['openAt'], ['closeAt']],
      (input) => !input.openAt || !input.closeAt || input.closeAt > input.openAt,
      '受付終了日時は受付開始日時より後にしてください'
    ),
    ['closeAt']
  )
)

export type StaffFormData = v.InferOutput<typeof staffFormSchema>

/**
 * Staff participation type create form schema (includes dates)
 */
export const staffParticipationTypeFormSchema = v.pipe(
  v.object({
    name: requiredTextSchema('参加種別名'),
    usersCountMin: v.pipe(v.number(), v.integer(), v.minValue(1, '1以上の値を入力してください')),
    usersCountMax: v.pipe(v.number(), v.integer(), v.minValue(1, '1以上の値を入力してください')),
    openAt: v.pipe(v.string(), v.minLength(1, '受付開始日時を入力してください')),
    closeAt: v.pipe(v.string(), v.minLength(1, '受付終了日時を入力してください'))
  }),
  v.forward(
    v.partialCheck(
      [['usersCountMin'], ['usersCountMax']],
      (input) => input.usersCountMax >= input.usersCountMin,
      '最大人数は最低人数以上にしてください'
    ),
    ['usersCountMax']
  ),
  v.forward(
    v.partialCheck(
      [['openAt'], ['closeAt']],
      (input) => !input.openAt || !input.closeAt || input.closeAt > input.openAt,
      '受付終了日時は受付開始日時より後にしてください'
    ),
    ['closeAt']
  )
)

export type StaffParticipationTypeFormData = v.InferOutput<typeof staffParticipationTypeFormSchema>

/**
 * Staff participation type edit form schema (name + member count only)
 */
export const staffParticipationTypeEditFormSchema = v.pipe(
  v.object({
    name: requiredTextSchema('参加種別名'),
    usersCountMin: v.pipe(v.number(), v.integer(), v.minValue(1, '1以上の値を入力してください')),
    usersCountMax: v.pipe(v.number(), v.integer(), v.minValue(1, '1以上の値を入力してください'))
  }),
  v.forward(
    v.partialCheck(
      [['usersCountMin'], ['usersCountMax']],
      (input) => input.usersCountMax >= input.usersCountMin,
      '最大人数は最低人数以上にしてください'
    ),
    ['usersCountMax']
  )
)

export type StaffParticipationTypeEditFormData = v.InferOutput<typeof staffParticipationTypeEditFormSchema>

/**
 * Staff page (notice) form schema
 */
export const staffPageFormSchema = v.object({
  title: requiredTextSchema('タイトル'),
  body: requiredTextSchema('本文')
})

export type StaffPageFormData = v.InferOutput<typeof staffPageFormSchema>

/**
 * Staff tag form schema
 */
export const staffTagFormSchema = v.object({
  name: requiredTextSchema('タグ名'),
  color: v.picklist(['gray', 'red', 'orange', 'green', 'blue', 'purple'])
})

export type StaffTagFormData = v.InferOutput<typeof staffTagFormSchema>

/**
 * Staff place form schema
 */
export const staffPlaceFormSchema = v.object({
  name: requiredTextSchema('場所名'),
  type: v.pipe(
    v.number(),
    v.check((val) => [1, 2, 3].includes(val), 'タイプを選択してください')
  )
})

export type StaffPlaceFormData = v.InferOutput<typeof staffPlaceFormSchema>

/**
 * Build a dynamic Valibot schema for FormAnswerDraft based on the loaded questions.
 * heading/upload type questions are excluded from validation.
 */
export function buildFormAnswerSchema(questions: FormQuestion[]) {
  const shape: Record<string, v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> = {}

  for (const question of questions) {
    if (question.type === 'heading' || question.type === 'upload') {
      continue
    }

    const fieldSchema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>> = question.type === 'number'
      ? v.pipe(
          v.string(),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const val = dataset.value
            if (val === '' && !question.isRequired) return
            if (val === '') {
              addIssue({ message: `${question.name}を入力してください` })
              return
            }
            const num = Number(val)
            if (isNaN(num)) {
              addIssue({ message: '数値を入力してください' })
              return
            }
            if (question.numberMin !== null && num < question.numberMin) {
              addIssue({ message: `${question.numberMin}以上の値を入力してください` })
            }
            if (question.numberMax !== null && num > question.numberMax) {
              addIssue({ message: `${question.numberMax}以下の値を入力してください` })
            }
          })
        )
      : question.type === 'checkbox'
        ? (() => {
            const base = v.array(v.string())
            return question.isRequired ? v.pipe(base, v.minLength(1, `${question.name}を選択してください`)) : base
          })()
        : ['text', 'textarea', 'markdown'].includes(question.type)
          ? v.pipe(
              v.string(),
              v.rawCheck(({ dataset, addIssue }) => {
                if (!dataset.typed) return
                const val = dataset.value
                if (val === '' && !question.isRequired) return
                if (val === '') {
                  addIssue({ message: `${question.name}を入力してください` })
                  return
                }
                if (question.numberMin !== null && Array.from(val).length < question.numberMin) {
                  addIssue({ message: `${question.numberMin}文字以上で入力してください` })
                }
                if (question.numberMax !== null && Array.from(val).length > question.numberMax) {
                  addIssue({ message: `${question.numberMax}文字以下で入力してください` })
                }
              })
            )
          : // Select, radio
            question.isRequired
            ? v.pipe(v.string(), v.minLength(1, `${question.name}を入力してください`))
            : v.string()

    shape[question.id] = fieldSchema
  }

  // Passthrough: allow 'legacy-body' and upload keys not in the schema
  return v.looseObject(shape)
}
