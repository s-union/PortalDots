import { describe, expect, it } from 'vitest'
import {
  passwordSchema,
  fullNameSchema,
  nameYomiSchema,
  phoneNumberSchema,
  optionalEmailSchema,
  hiraganaSchema,
  requiredTextSchema,
  userRegistrationFormSchema,
  circleRegistrationFormSchema
} from './schemas'

describe('passwordSchema', () => {
  it('accepts valid password with 8+ chars, letters and numbers', () => {
    expect(passwordSchema.safeParse('password123').success).toBe(true)
    expect(passwordSchema.safeParse('Abc12345').success).toBe(true)
    expect(passwordSchema.safeParse('Test9999').success).toBe(true)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = passwordSchema.safeParse('abc123')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('8文字以上')
    }
  })

  it('rejects password without letters', () => {
    const result = passwordSchema.safeParse('12345678')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('英字')
    }
  })

  it('rejects password without numbers', () => {
    const result = passwordSchema.safeParse('abcdefgh')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('数字')
    }
  })
})

describe('fullNameSchema', () => {
  it('accepts name with half-width space between family and given name', () => {
    expect(fullNameSchema.safeParse('山田 太郎').success).toBe(true)
    expect(fullNameSchema.safeParse('田中 花子').success).toBe(true)
    expect(fullNameSchema.safeParse('John Smith').success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = fullNameSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('名前を入力')
    }
  })

  it('rejects name without half-width space', () => {
    const result = fullNameSchema.safeParse('山田太郎')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('半角スペース')
    }
  })

  it('rejects value with only spaces', () => {
    const result = fullNameSchema.safeParse('   ')
    expect(result.success).toBe(false)
  })

  it('rejects name with full-width space', () => {
    const result = fullNameSchema.safeParse('山田　太郎')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('半角スペース')
    }
  })
})

describe('nameYomiSchema', () => {
  it('accepts hiragana with half-width space', () => {
    expect(nameYomiSchema.safeParse('やまだ たろう').success).toBe(true)
    expect(nameYomiSchema.safeParse('たなか はなこ').success).toBe(true)
  })

  it('rejects empty input', () => {
    const result = nameYomiSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('ふりがな')
    }
  })

  it('rejects input with katakana', () => {
    const result = nameYomiSchema.safeParse('ヤマダ タロウ')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('ひらがな')
    }
  })

  it('rejects input without half-width space', () => {
    const result = nameYomiSchema.safeParse('やまだたろう')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('半角スペース')
    }
  })

  it('rejects yomi with only spaces', () => {
    const result = nameYomiSchema.safeParse('   ')
    expect(result.success).toBe(false)
  })
})

describe('phoneNumberSchema', () => {
  it('accepts valid phone number formats', () => {
    expect(phoneNumberSchema.safeParse('090-1234-5678').success).toBe(true)
    expect(phoneNumberSchema.safeParse('09012345678').success).toBe(true)
    expect(phoneNumberSchema.safeParse('(03)1234-5678').success).toBe(true)
  })

  it('rejects empty input', () => {
    const result = phoneNumberSchema.safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('電話番号を入力')
    }
  })

  it('rejects invalid characters', () => {
    const result = phoneNumberSchema.safeParse('090-abcd-5678')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('形式が正しくありません')
    }
  })
})

describe('optionalEmailSchema', () => {
  it('accepts valid email', () => {
    expect(optionalEmailSchema.safeParse('test@example.com').success).toBe(true)
  })

  it('accepts empty string', () => {
    expect(optionalEmailSchema.safeParse('').success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = optionalEmailSchema.safeParse('invalid-email')
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only value', () => {
    const result = optionalEmailSchema.safeParse('   ')
    expect(result.success).toBe(false)
  })
})

describe('hiraganaSchema', () => {
  it('accepts hiragana input', () => {
    expect(hiraganaSchema.safeParse('てすと').success).toBe(true)
    expect(hiraganaSchema.safeParse('てすと きかく').success).toBe(true)
  })

  it('rejects kanji', () => {
    const result = hiraganaSchema.safeParse('テスト企画')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('ひらがな')
    }
  })
})

describe('requiredTextSchema', () => {
  it('accepts non-empty text', () => {
    expect(requiredTextSchema('テスト').safeParse('value').success).toBe(true)
  })

  it('rejects empty text', () => {
    const result = requiredTextSchema('フィールド').safeParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('フィールドを入力')
    }
  })
})

describe('userRegistrationFormSchema', () => {
  const validForm = {
    name: '山田 太郎',
    nameYomi: 'やまだ たろう',
    contactEmail: '',
    phoneNumber: '090-1234-5678',
    password: 'password123',
    passwordConfirmation: 'password123'
  }

  it('accepts valid form data', () => {
    expect(userRegistrationFormSchema.safeParse(validForm).success).toBe(true)
  })

  it('rejects mismatched password confirmation', () => {
    const result = userRegistrationFormSchema.safeParse({
      ...validForm,
      passwordConfirmation: 'different123'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('一致しません')
    }
  })

  it('validates all required fields', () => {
    const result = userRegistrationFormSchema.safeParse({
      name: '',
      nameYomi: '',
      contactEmail: '',
      phoneNumber: '',
      password: '',
      passwordConfirmation: ''
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})

describe('circleRegistrationFormSchema', () => {
  const validForm = {
    name: 'テスト企画',
    nameYomi: 'てすときかく',
    groupName: 'テストサークル',
    groupNameYomi: 'てすとさーくる',
    participationTypeId: 'pt-1',
    notes: ''
  }

  it('accepts valid form data', () => {
    expect(circleRegistrationFormSchema.safeParse(validForm).success).toBe(true)
  })

  it('rejects missing participation type', () => {
    const result = circleRegistrationFormSchema.safeParse({
      ...validForm,
      participationTypeId: ''
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('参加種別')
    }
  })

  it('rejects non-hiragana nameYomi', () => {
    const result = circleRegistrationFormSchema.safeParse({
      ...validForm,
      nameYomi: 'テスト企画'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('ひらがな')
    }
  })

  it('rejects missing group name', () => {
    const result = circleRegistrationFormSchema.safeParse({
      ...validForm,
      groupName: ''
    })
    expect(result.success).toBe(false)
  })
})
