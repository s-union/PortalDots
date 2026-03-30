import { z } from 'zod'

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

/**
 * Circle registration form schema
 */
export const circleRegistrationFormSchema = z.object({
  name: requiredTextSchema('企画名'),
  nameYomi: hiraganaSchema,
  groupName: requiredTextSchema('団体名'),
  groupNameYomi: hiraganaSchema,
  participationTypeId: z.string().min(1, '参加種別を選択してください'),
  notes: z.string().optional()
})

export type CircleRegistrationFormData = z.infer<typeof circleRegistrationFormSchema>
