export const mockUser = {
  id: 'user-1',
  displayName: '山田 太郎',
  canDeleteAccount: true,
  canCreateCircleRegistration: true,
  studentId: 'S12345678',
  univemail: 's12345678@example.ac.jp',
  lastName: '山田',
  lastNameReading: 'ヤマダ',
  firstName: '太郎',
  firstNameReading: 'タロウ',
  contactEmail: 'taro.yamada@example.com',
  phoneNumber: '090-0000-0000'
}

export const mockStaffUser = {
  ...mockUser,
  id: 'staff-1',
  displayName: 'スタッフ 一郎',
  studentId: 'S99999999'
}

export const mockCircle = {
  id: 'circle-1',
  name: 'テストサークル',
  nameYomi: 'テストサークル',
  groupName: 'テストグループ',
  groupNameYomi: 'テストグループ',
  participationTypeId: 'type-1',
  participationTypeName: '一般参加',
  formId: 'form-1',
  notes: '',
  leaderDisplayName: '山田 太郎',
  canChangeGroupName: true,
  isLeader: true,
  lastUpdatedAt: '2026-01-01T00:00:00Z',
  usersCountMin: 1,
  usersCountMax: 10,
  memberCount: 3,
  canSubmit: true,
  formDescription: '企画参加登録フォームです。',
  confirmationMessage: '登録が完了しました。',
  questions: [],
  answer: null,
  invitationToken: 'mock-token-abc123',
  submittedAt: null,
  status: 'pending' as const,
  formCloseAt: '2026-12-31T23:59:59Z',
  places: []
}

export const mockTag = {
  id: 'tag-1',
  name: '文化系',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

export const mockPlace = {
  id: 'place-1',
  name: 'メインステージ',
  type: 1,
  notes: '最大収容500人',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

export const mockContactCategory = {
  id: 'cat-1',
  name: '一般問い合わせ',
  email: 'contact@example.com'
}

export const mockPage = {
  id: 'page-1',
  title: 'テストお知らせ',
  summary: 'これはテスト用のお知らせです。',
  isLimited: false,
  isNew: true,
  isUnread: false,
  createdAt: '2026-01-10T09:00:00Z',
  updatedAt: '2026-01-15T12:00:00Z'
}

export const mockPageDetail = {
  id: 'page-1',
  title: 'テストお知らせ',
  body: '# テストお知らせ\n\nこれはテスト用のお知らせ本文です。\n\n- 項目1\n- 項目2',
  isLimited: false,
  createdAt: '2026-01-10T09:00:00Z',
  updatedAt: '2026-01-15T12:00:00Z',
  documents: []
}

export const mockDocument = {
  id: 'doc-1',
  name: 'テスト配布資料.pdf',
  description: 'テスト用の配布資料です。',
  isImportant: false,
  isNew: true,
  extension: 'pdf',
  sizeBytes: 204800,
  updatedAt: '2026-01-15T12:00:00Z',
  downloadUrl: '/v1/documents/doc-1/download'
}

export const mockForm = {
  id: 'form-1',
  name: 'テスト申請フォーム',
  description: 'テスト用の申請フォームです。',
  openAt: '2026-01-01T00:00:00Z',
  closeAt: '2026-12-31T23:59:59Z',
  maxAnswers: 1,
  answerableTags: [],
  confirmationMessage: '申請が完了しました。',
  isPublic: true,
  isOpen: true,
  hasAnswer: false
}

export const mockParticipationType = {
  id: 'type-1',
  name: '一般参加',
  description: '一般的な参加形式です。',
  usersCountMin: 1,
  usersCountMax: 10,
  tags: [],
  form: {
    id: 'form-pt-1',
    name: '参加登録フォーム',
    description: '参加登録フォームです。',
    openAt: '2026-01-01T00:00:00Z',
    closeAt: '2026-12-31T23:59:59Z',
    isPublic: true,
    isOpen: true,
    maxAnswers: 1,
    answerableTags: [],
    confirmationMessage: '登録が完了しました。'
  }
}

export const mockSessionBootstrap = {
  csrfToken: 'mock-csrf-token',
  featureFlags: [],
  roles: [],
  permissions: [],
  currentCircle: null as null | { id: string; name: string },
  user: mockUser as typeof mockUser | null
}

export const mockSessionBootstrapStaff = {
  ...mockSessionBootstrap,
  roles: ['admin'],
  permissions: [
    'circles.read',
    'circles.edit',
    'users.read',
    'users.edit',
    'staff.read',
    'pages.read',
    'pages.edit',
    'forms.read',
    'forms.edit',
    'documents.read',
    'documents.edit',
    'tags.read',
    'tags.edit',
    'places.read',
    'places.edit',
    'contact-categories.read',
    'permissions.edit',
    'staff.exports',
    'mails.read',
    'activity-logs.read',
    'portal-settings.edit',
    'participation-types.edit'
  ],
  user: mockStaffUser
}

export const mockPublicConfig = {
  isDemo: false,
  appName: 'PortalDots',
  portalStudentIdName: '学籍番号',
  portalUnivemailName: '大学メール',
  portalUnivemailDomainPart: 'example.ac.jp'
}

export const mockPublicHome = {
  appName: 'PortalDots',
  portalDescription: 'テスト大学 学園祭実行委員会のポータルシステムです。',
  portalAdminName: 'テスト大学 学園祭実行委員会',
  portalContactEmail: 'contact@example.com',
  loginMethods: [{ roleLabel: '一般', loginId: 'student@example.ac.jp', password: 'password' }],
  pinnedPages: [],
  participationTypes: [mockParticipationType],
  pages: [mockPage],
  documents: [mockDocument]
}

export const mockStaffCircle = {
  id: 'circle-1',
  name: 'テストサークル',
  nameYomi: 'テストサークル',
  groupName: 'テストグループ',
  groupNameYomi: 'テストグループ',
  participationTypeId: 'type-1',
  participationTypeName: '一般参加',
  tags: ['文化系'],
  notes: '',
  submittedAt: null,
  status: 'pending' as const,
  statusReason: '',
  statusSetAt: null,
  statusSetById: null,
  places: []
}

export const mockStaffUser2 = {
  id: 'staff-user-1',
  lastName: '鈴木',
  lastNameReading: 'スズキ',
  firstName: '二郎',
  firstNameReading: 'ジロウ',
  displayName: '鈴木 二郎',
  loginIds: ['suzuki@example.com'],
  contactEmail: 'suzuki@example.com',
  univemail: 'suzuki@example.ac.jp',
  phoneNumber: '090-1111-1111',
  roles: [],
  isVerified: true,
  isEmailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

export const mockActivityLog = {
  id: 'log-1',
  actorUserId: 'user-1',
  action: 'update',
  targetType: 'circle',
  targetId: 'circle-1',
  circleId: 'circle-1',
  summary: 'テストサークルを更新しました',
  createdAt: '2026-01-15T10:30:00Z'
}

export const mockMail = {
  jobId: 'mail-1',
  template: 'markdown-notice',
  priority: 'normal' as const,
  subject: 'テストメール',
  body: 'これはテスト用のメール本文です。',
  recipients: ['all'],
  createdAt: '2026-01-15T10:00:00Z'
}
