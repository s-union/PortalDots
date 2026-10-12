import * as v from 'valibot'
import { categoryIdSchema, participationTypeIdSchema } from '@/lib/api/schema'
import { fieldUi, formLayout, type FieldOption } from '@/features/forms/schema-form'
import { tagColors, type TagColor } from '@/lib/tagColor'

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
export const profileUpdateFormSchema = v.pipe(
  v.object({
    name: v.pipe(
      fullNameSchema,
      fieldUi({
        control: 'text',
        label: '名前',
        autocomplete: 'name',
        placeholder: '姓 名',
        labelClass: 'font-semibold'
      })
    ),
    nameYomi: v.pipe(
      nameYomiSchema,
      fieldUi({
        control: 'text',
        label: '名前(よみ)',
        autocomplete: 'off',
        placeholder: 'せい めい',
        labelClass: 'font-semibold'
      })
    ),
    contactEmail: v.pipe(
      requiredEmailSchema,
      fieldUi({ control: 'email', label: '連絡先メールアドレス', autocomplete: 'email', labelClass: 'font-semibold' })
    ),
    phoneNumber: v.pipe(
      phoneNumberSchema,
      fieldUi({ control: 'tel', label: '連絡先電話番号', autocomplete: 'tel', labelClass: 'font-semibold' })
    ),
    currentPassword: v.pipe(
      v.string(),
      v.minLength(1, '現在のパスワードを入力してください'),
      fieldUi({ control: 'password', label: '認証情報', autocomplete: 'current-password', labelClass: 'font-semibold' })
    )
  }),
  // The general settings tab shows the server-supplied, read-only student ID and university email
  // ahead of the editable fields (see `formLayout`'s `display` item: it renders from the page's
  // `displayValues`/`displayLabels` props, not from this schema's own fields).
  formLayout([
    { display: 'studentId', label: '学生番号' },
    { display: 'univemail', label: '学生用メールアドレス' },
    // `testId`s keep this page's pre-existing test hooks (`settings-name-row`/`settings-auth-row`).
    { field: 'name', testId: 'settings-name-row' },
    'nameYomi',
    'contactEmail',
    'phoneNumber',
    { field: 'currentPassword', testId: 'settings-auth-row' }
  ])
)

export type ProfileUpdateFormData = v.InferOutput<typeof profileUpdateFormSchema>

/**
 * Password change form schema
 */
export const passwordChangeFormSchema = v.pipe(
  v.object({
    currentPassword: v.pipe(
      v.string(),
      v.minLength(1, '現在のパスワードを入力してください'),
      fieldUi({ control: 'password', label: '現在のパスワード', autocomplete: 'current-password' })
    ),
    newPassword: v.pipe(
      passwordSchema,
      fieldUi({
        control: 'password',
        label: '新しいパスワード',
        autocomplete: 'new-password',
        placeholder: '8文字以上（英字・数字を含む）'
      })
    ),
    confirmPassword: v.pipe(
      v.string(),
      fieldUi({ control: 'password', label: '新しいパスワード(確認)', autocomplete: 'new-password', required: true })
    )
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
  categoryId: v.pipe(
    categoryIdSchema,
    v.minLength(1, 'お問い合わせ項目を選択してください'),
    fieldUi({ control: 'select', label: 'お問い合わせ項目', id: 'contact-category' })
  ),
  ccSubleader: v.pipe(
    v.boolean(),
    fieldUi({
      control: 'checkbox',
      variant: 'card',
      label: '返信内容の共有先',
      checkboxLabel: '副責任者にもメールで共有する（CC）',
      description: 'チェックを外すと送信者のみに確認メールが送信されます。'
    })
  ),
  body: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'お問い合わせ内容を入力してください'),
    fieldUi({ control: 'textarea', label: 'お問い合わせ内容', inputClass: 'min-h-40', id: 'contact-body' })
  )
})

export type ContactFormData = v.InferOutput<typeof contactFormSchema>

/**
 * User registration form schema
 */
export const userRegistrationFormSchema = v.pipe(
  v.object({
    name: v.pipe(
      fullNameSchema,
      fieldUi({
        control: 'text',
        label: '名前',
        autocomplete: 'name',
        placeholder: '姓 名',
        labelClass: 'font-semibold'
      })
    ),
    nameYomi: v.pipe(
      nameYomiSchema,
      fieldUi({ control: 'text', label: '名前(よみ)', placeholder: 'せい めい', labelClass: 'font-semibold' })
    ),
    contactEmail: v.pipe(
      optionalEmailSchema,
      fieldUi({ control: 'email', label: '連絡先メールアドレス', autocomplete: 'email', labelClass: 'font-semibold' })
    ),
    phoneNumber: v.pipe(
      phoneNumberSchema,
      fieldUi({ control: 'tel', label: '連絡先電話番号', autocomplete: 'tel', labelClass: 'font-semibold' })
    ),
    password: v.pipe(
      passwordSchema,
      fieldUi({
        control: 'password',
        label: 'パスワード',
        autocomplete: 'new-password',
        placeholder: '8文字以上（英字・数字を含む）',
        labelClass: 'font-semibold'
      })
    ),
    passwordConfirmation: v.pipe(
      v.string(),
      fieldUi({
        control: 'password',
        label: 'パスワード(確認)',
        autocomplete: 'new-password',
        required: true,
        labelClass: 'font-semibold'
      })
    )
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['passwordConfirmation']],
      (input) => input.password === input.passwordConfirmation,
      '確認用パスワードが一致しません'
    ),
    ['passwordConfirmation']
  ),
  // The verify page shows the server-verified, read-only student ID and university email side by
  // side ahead of the editable fields (see `formLayout`'s `display` row entries: they render from
  // that page's `displayValues` prop, not from this schema's own fields).
  formLayout([
    {
      row: [
        { display: 'studentId', label: '学籍番号' },
        { display: 'univemail', label: '大学メールアドレス' }
      ]
    },
    { row: ['name', 'nameYomi'] },
    { row: ['contactEmail', 'phoneNumber'] },
    { row: ['password', 'passwordConfirmation'] }
  ])
)

export type UserRegistrationFormData = v.InferOutput<typeof userRegistrationFormSchema>

export const registrationStartFormSchema = v.object({
  // `label`/`suffix` are placeholder text: the page overrides both at runtime from
  // `usePublicConfigQuery` (the actual university email name/domain vary per deployment).
  univemailLocalPart: v.pipe(
    requiredTextSchema('大学メールアドレス'),
    v.regex(/^[^@\s]+$/, '大学メールアドレスの @ より前の部分を入力してください'),
    fieldUi({
      control: 'text',
      label: '大学メールアドレス',
      autocomplete: 'email',
      id: 'register-email',
      labelClass: 'font-semibold'
    })
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
// `name`/`id` overrides below are a deviation from the default (dotted-key-derived) rendering:
// every caller renders this schema's fields nested one level under a `basic` group (see
// `circle-detail-form.ts`/`circle-registration-form.ts`), but existing tests and the submitted
// payload both expect the bare field key (e.g. `name="name"`, not `name="basic.name"`).
export const circleRegistrationFormSchema = v.object({
  name: v.pipe(
    requiredTextSchema('企画名'),
    fieldUi({ control: 'text', label: '企画名', labelClass: 'font-semibold', id: 'circle-name', name: 'name' })
  ),
  nameYomi: v.pipe(
    hiraganaSchema,
    fieldUi({
      control: 'text',
      label: '企画名（よみ）',
      labelClass: 'font-semibold',
      placeholder: 'ひらがなで入力',
      id: 'circle-nameYomi',
      name: 'nameYomi'
    })
  ),
  groupName: v.pipe(
    requiredTextSchema('団体名'),
    fieldUi({
      control: 'text',
      label: '企画を出店する団体の名称',
      labelClass: 'font-semibold',
      placeholder: '例: ○○サークル',
      id: 'circle-groupName',
      name: 'groupName'
    })
  ),
  groupNameYomi: v.pipe(
    hiraganaSchema,
    fieldUi({
      control: 'text',
      label: '企画を出店する団体の名称（よみ）',
      labelClass: 'font-semibold',
      placeholder: 'ひらがなで入力',
      id: 'circle-groupNameYomi',
      name: 'groupNameYomi'
    })
  ),
  participationTypeId: v.pipe(
    participationTypeIdSchema,
    v.minLength(1, '参加種別を選択してください'),
    fieldUi({
      control: 'select',
      label: '参加種別',
      labelClass: 'font-semibold',
      id: 'circle-participationTypeId',
      name: 'participationTypeId'
    })
  ),
  notes: v.pipe(
    v.optional(v.string()),
    fieldUi({
      control: 'textarea',
      label: '備考',
      labelClass: 'font-semibold',
      id: 'circle-notes',
      name: 'notes',
      rows: 3
    })
  )
})

export type CircleRegistrationFormData = v.InferOutput<typeof circleRegistrationFormSchema>

/**
 * Staff form (application form) schema
 */
export const staffFormSchema = v.pipe(
  v.object({
    name: v.pipe(
      requiredTextSchema('フォーム名'),
      fieldUi({ control: 'text', label: 'フォーム名', caption: '一覧と回答画面で表示する名称です。必須項目です。' })
    ),
    maxAnswers: v.pipe(
      v.number('数値を入力してください'),
      v.integer(),
      v.minValue(1, '1以上の値を入力してください'),
      fieldUi({
        control: 'number',
        label: '企画毎に回答可能とする回答数',
        helper:
          '通常は「1」にします。1企画がこのフォームに対し複数の回答を作成できるようにするには、2以上の値を入力してください。',
        caption: '企画ごとにこのフォームへ回答できる最大回答数です。',
        min: 1
      })
    ),
    description: v.pipe(
      v.optional(v.string(), ''),
      fieldUi({
        control: 'markdown',
        label: 'フォームの説明',
        inputClass: 'min-h-32',
        caption: 'フォームの説明を入力します。'
      })
    ),
    answerableTags: v.pipe(
      v.optional(v.array(v.string()), []),
      fieldUi({
        control: 'tags',
        label: 'フォームへ回答可能なユーザー',
        helper:
          '空欄の場合、企画に所属するユーザー全員がフォームに回答できます。タグを指定した場合、指定したタグのうち、1つ以上該当する企画がフォームに回答できます。',
        caption: '空欄なら全員、タグを指定するといずれかに該当する企画だけが回答できます。'
      })
    ),
    confirmationMessage: v.pipe(
      v.optional(v.string(), ''),
      fieldUi({
        control: 'markdown',
        label: '回答完了メッセージ',
        helper:
          'フォームに回答した方に向けて表示するメッセージを設定できます。この内容は、回答したユーザーに自動で送信されるメールにも表示されます。',
        inputClass: 'min-h-24',
        caption: '提出後に表示する補足文言です。未設定なら既定メッセージを使います。'
      })
    ),
    staffNotificationUserIds: v.pipe(
      v.optional(v.array(v.string()), []),
      fieldUi({
        control: 'users',
        label: 'スタッフ用控えの送信先',
        helper:
          '回答があったときに「スタッフ用控え」のメールを送信するスタッフを選択します。未指定の場合、フォーム作成者が送信先になります。',
        caption: '未指定の場合はフォーム作成者が送信先になります。'
      })
    ),
    isPublic: v.pipe(
      v.optional(v.boolean(), false),
      fieldUi({
        control: 'checkbox',
        label: '公開設定',
        checkboxLabel: '公開する',
        helper:
          'フォームの内容を公開した場合でも、上記の受付期間内ではない場合、ユーザーはフォームに回答したり、回答内容を編集したりできません。',
        caption: '受付期間外では、公開中でもユーザーは回答や編集を行えません。'
      })
    ),
    openAt: v.pipe(
      v.string(),
      v.minLength(1, '受付開始日時を入力してください'),
      fieldUi({ control: 'datetime', label: '受付開始日時', helper: 'フォームへの回答受付を開始する日時。' })
    ),
    closeAt: v.pipe(
      v.string(),
      v.minLength(1, '受付終了日時を入力してください'),
      fieldUi({ control: 'datetime', label: '受付終了日時', helper: 'フォームへの回答受付を終了する日時。' })
    )
  }),
  v.forward(
    v.partialCheck(
      [['openAt'], ['closeAt']],
      (input) => !input.openAt || !input.closeAt || input.closeAt > input.openAt,
      '受付終了日時は受付開始日時より後にしてください'
    ),
    ['closeAt']
  ),
  formLayout([
    'name',
    'maxAnswers',
    { row: ['openAt', 'closeAt'], label: '受付期間', caption: '受付開始日時と受付終了日時を指定します。' },
    'isPublic',
    'answerableTags',
    'staffNotificationUserIds',
    { section: 'フォームの説明', collapsible: true, items: ['description'] },
    { section: '回答後に表示する内容', collapsible: true, items: ['confirmationMessage'] }
  ])
)

export type StaffFormData = v.InferOutput<typeof staffFormSchema>

/**
 * Staff participation type create form schema (includes dates)
 */
export const staffParticipationTypeFormSchema = v.pipe(
  v.object({
    name: v.pipe(requiredTextSchema('参加種別名'), fieldUi({ control: 'text', label: '参加種別名' })),
    usersCountMin: v.pipe(
      v.number('数値を入力してください'),
      v.integer(),
      v.minValue(1, '1以上の値を入力してください'),
      fieldUi({ control: 'number', label: '最低人数', min: 1 })
    ),
    usersCountMax: v.pipe(
      v.number('数値を入力してください'),
      v.integer(),
      v.minValue(1, '1以上の値を入力してください'),
      fieldUi({ control: 'number', label: '最大人数', min: 1 })
    ),
    description: v.pipe(
      v.optional(v.string(), ''),
      fieldUi({ control: 'textarea', label: '説明', inputClass: 'min-h-24' })
    ),
    tags: v.pipe(v.optional(v.array(v.string()), []), fieldUi({ control: 'tags', label: '付与タグ' })),
    formDescription: v.pipe(
      v.optional(v.string(), ''),
      fieldUi({ control: 'markdown', label: '参加登録前に表示する内容', inputClass: 'min-h-24' })
    ),
    formConfirmationMessage: v.pipe(
      v.optional(v.string(), ''),
      fieldUi({ control: 'markdown', label: '提出後メッセージ', inputClass: 'min-h-24' })
    ),
    isPublic: v.pipe(
      v.optional(v.boolean(), true),
      fieldUi({ control: 'checkbox', label: '公開設定', checkboxLabel: '参加登録画面を公開する' })
    ),
    openAt: v.pipe(
      v.string(),
      v.minLength(1, '受付開始日時を入力してください'),
      fieldUi({ control: 'datetime', label: '受付開始日時' })
    ),
    closeAt: v.pipe(
      v.string(),
      v.minLength(1, '受付終了日時を入力してください'),
      fieldUi({ control: 'datetime', label: '受付終了日時' })
    )
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
  ),
  formLayout([
    'name',
    'description',
    { row: ['usersCountMin', 'usersCountMax'] },
    'tags',
    { row: ['openAt', 'closeAt'] },
    'formDescription',
    'formConfirmationMessage',
    'isPublic'
  ])
)

export type StaffParticipationTypeFormData = v.InferOutput<typeof staffParticipationTypeFormSchema>

/**
 * Staff participation type edit form schema (name + member count only)
 */
export const staffParticipationTypeEditFormSchema = v.pipe(
  v.object({
    name: v.pipe(
      requiredTextSchema('参加種別名'),
      fieldUi({
        control: 'text',
        label: '参加種別名',
        caption: '一般ユーザーに表示する名称です。模擬店や展示など、参加区分を分かりやすく入力します。'
      })
    ),
    usersCountMin: v.pipe(
      v.number('数値を入力してください'),
      v.integer(),
      v.minValue(1, '1以上の値を入力してください'),
      fieldUi({ control: 'number', label: '最低人数', min: 1 })
    ),
    usersCountMax: v.pipe(
      v.number('数値を入力してください'),
      v.integer(),
      v.minValue(1, '1以上の値を入力してください'),
      fieldUi({ control: 'number', label: '最大人数', min: 1 })
    ),
    description: v.pipe(
      v.optional(v.string(), ''),
      fieldUi({
        control: 'textarea',
        label: '説明',
        inputClass: 'min-h-24',
        caption: '参加登録画面の案内として一般ユーザーに表示します。'
      })
    ),
    tags: v.pipe(
      v.optional(v.array(v.string()), []),
      fieldUi({
        control: 'tags',
        label: '付与タグ',
        caption: 'この設定を保存した後に作成される企画へ、自動で追加するタグを改行またはカンマ区切りで入力します。',
        helper: '候補から追加しつつ、必要なら未登録タグもそのまま追加できます。'
      })
    ),
    formDescription: v.optional(v.string(), ''),
    formConfirmationMessage: v.optional(v.string(), ''),
    openAt: v.optional(v.string(), ''),
    closeAt: v.optional(v.string(), ''),
    isPublic: v.optional(v.boolean(), true)
  }),
  v.forward(
    v.partialCheck(
      [['usersCountMin'], ['usersCountMax']],
      (input) => input.usersCountMax >= input.usersCountMin,
      '最大人数は最低人数以上にしてください'
    ),
    ['usersCountMax']
  ),
  formLayout([
    'name',
    'description',
    {
      row: ['usersCountMin', 'usersCountMax'],
      label: '必要人数',
      caption: '企画責任者を含む参加登録可能人数の下限と上限です。個人参加のみなら 1 を指定します。'
    },
    'tags'
  ])
)

export type StaffParticipationTypeEditFormData = v.InferOutput<typeof staffParticipationTypeEditFormSchema>

/**
 * Staff page (notice) form schema
 */
export const staffPageFormSchema = v.object({
  title: v.pipe(
    requiredTextSchema('タイトル'),
    fieldUi({ control: 'text', label: 'タイトル', labelClass: 'font-medium' })
  ),
  body: v.pipe(
    requiredTextSchema('本文'),
    fieldUi({
      control: 'markdown',
      label: '本文',
      labelClass: 'font-medium',
      helper: 'Markdown で入力できます。表、取り消し線、タスクリスト、脚注は GFM として表示されます。',
      inputClass: 'min-h-56'
    })
  ),
  notes: v.pipe(
    v.optional(v.string(), ''),
    fieldUi({ control: 'textarea', label: 'スタッフ用メモ', labelClass: 'font-medium', inputClass: 'min-h-28' })
  ),
  viewableTags: v.pipe(
    v.optional(v.array(v.string()), []),
    fieldUi({
      control: 'tags',
      label: '閲覧可能なタグ',
      labelClass: 'font-medium',
      helper: '空欄なら全員に公開、指定すると一致する企画タグだけに限定公開します。'
    })
  ),
  documentIds: v.pipe(
    v.optional(v.array(v.string()), []),
    fieldUi({
      control: 'checkboxGroup',
      label: '関連する配布資料',
      labelClass: 'font-medium',
      loadingMessage: '配布資料を読み込み中...',
      emptyMessage: '選択できる配布資料はありません。'
    })
  ),
  isPinned: v.pipe(
    v.optional(v.boolean(), false),
    fieldUi({ control: 'checkbox', label: '表示位置', checkboxLabel: '固定表示する' })
  ),
  isPublic: v.pipe(
    v.optional(v.boolean(), true),
    fieldUi({ control: 'checkbox', label: '公開設定', checkboxLabel: '公開する' })
  ),
  publishedAt: v.pipe(
    v.optional(v.string(), ''),
    v.transform((value) => value || null),
    fieldUi({
      control: 'datetime',
      label: '公開日時（日本時間）',
      labelClass: 'font-medium',
      id: 'staff-page-published-at-input'
    })
  ),
  sendEmails: v.pipe(
    v.optional(v.boolean(), false),
    fieldUi({
      control: 'checkbox',
      label: 'メール配信',
      checkboxLabel: '公開時にメールで配信する',
      helper:
        '公開日時になったタイミングでメールを配信します。公開日時が空欄または過去の日時の場合は、保存後1分以内に配信します。予約中のメール配信は、チェックを外して保存するとキャンセルされます。'
    })
  )
})

export type StaffPageFormData = v.InferOutput<typeof staffPageFormSchema>

/**
 * Staff tag colour labels, shared between the colour swatch legend and `StaffTagEditor`'s picker.
 */
const staffTagColorLabels: Record<TagColor, string> = {
  gray: 'グレー',
  red: '赤',
  orange: 'オレンジ',
  green: '緑',
  blue: '青',
  purple: '紫'
}

/**
 * Staff tag form schema
 */
export const staffTagFormSchema = v.object({
  name: v.pipe(requiredTextSchema('タグ名'), fieldUi({ control: 'text', label: 'タグ名', labelClass: 'font-medium' })),
  color: v.pipe(
    v.picklist(tagColors),
    fieldUi({
      control: 'colorRadio',
      label: 'タグの色',
      labelClass: 'font-medium',
      helper: 'タグ一覧や絞り込みでタグを色分けして表示します。',
      options: tagColors.map((value) => ({ value, label: staffTagColorLabels[value] }))
    })
  )
})

export type StaffTagFormData = v.InferOutput<typeof staffTagFormSchema>

/**
 * Staff place type options, shared by `StaffPlaceEditor`'s type select.
 */
const staffPlaceTypeOptions: readonly FieldOption[] = [
  { value: 1, label: '屋内' },
  { value: 2, label: '屋外' },
  { value: 3, label: '特殊場所' }
]

/**
 * Staff place form schema
 */
export const staffPlaceFormSchema = v.object({
  name: v.pipe(requiredTextSchema('場所名'), fieldUi({ control: 'text', label: '場所名', labelClass: 'font-medium' })),
  type: v.pipe(
    v.number('タイプを選択してください'),
    v.check((val) => [1, 2, 3].includes(val), 'タイプを選択してください'),
    fieldUi({ control: 'select', label: 'タイプ', labelClass: 'font-medium', options: staffPlaceTypeOptions })
  ),
  notes: v.pipe(
    v.optional(v.string(), ''),
    fieldUi({ control: 'textarea', label: 'スタッフ用メモ', labelClass: 'font-medium', inputClass: 'min-h-24' })
  )
})

export type StaffPlaceFormData = v.InferOutput<typeof staffPlaceFormSchema>

/**
 * Staff contact category form schema
 */
export const staffContactCategoryFormSchema = v.object({
  name: v.pipe(
    requiredTextSchema('カテゴリ名'),
    fieldUi({ control: 'text', label: 'カテゴリ名', labelClass: 'font-medium' })
  ),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('メールアドレスを入力してください'),
    fieldUi({ control: 'email', label: '送信先メールアドレス', labelClass: 'font-medium' })
  )
})

export type StaffContactCategoryFormData = v.InferOutput<typeof staffContactCategoryFormSchema>
